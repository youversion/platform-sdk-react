/** @internal */
export type ShadowOverlayKind = 'modal' | 'nonmodal';
/** @internal */
export type ShadowOverlayPhase = 'active' | 'exiting';

/** @internal */
export interface ShadowOverlayRegistration {
  id: string;
  kind: ShadowOverlayKind;
  /** Focus restoration target captured at launch, or null when no target exists. */
  opener: HTMLElement | null;
  /** Logical overlay that launched this overlay, independent of DOM or React ancestry. */
  parentId?: string;
  dismissible?: boolean;
}

/** @internal */
export type ShadowOverlayFocusTarget =
  | { kind: 'element'; element: HTMLElement }
  | { kind: 'layer'; id: string }
  | null;

/** @internal */
export interface ShadowOverlaySnapshot {
  ownerId: string | null;
  modalOwnerId: string | null;
  backgroundInert: boolean;
  layers: Array<{
    id: string;
    kind: ShadowOverlayKind;
    parentId: string | null;
    phase: ShadowOverlayPhase;
    eligible: boolean;
  }>;
}

interface ShadowOverlayLayer extends ShadowOverlayRegistration {
  dismissible: boolean;
  phase: ShadowOverlayPhase;
}

/** @internal Executable state model for ADR 0007's shadow-overlay ownership contract. */
export class ShadowOverlayOwnership {
  readonly #layers: ShadowOverlayLayer[] = [];

  mount(registration: ShadowOverlayRegistration): void {
    const existing = this.#layers.find((layer) => layer.id === registration.id);
    const parent =
      registration.parentId === undefined
        ? undefined
        : this.#layers.find((layer) => layer.id === registration.parentId);
    if (registration.parentId !== undefined && !parent) {
      throw new Error(
        `Cannot mount overlay "${registration.id}" with missing parent "${registration.parentId}"`,
      );
    }
    if (existing && parent === existing) {
      throw new Error(`Cannot mount overlay "${registration.id}" under itself`);
    }
    if (existing && parent && this.#hasAncestor(parent, existing.id)) {
      throw new Error(
        `Cannot mount overlay "${registration.id}" under descendant "${registration.parentId}"`,
      );
    }
    if (parent?.phase === 'exiting') {
      throw new Error(
        `Cannot mount overlay "${registration.id}" under exiting parent "${registration.parentId}"`,
      );
    }

    if (existing) {
      Object.assign(existing, registration, {
        dismissible: registration.dismissible ?? true,
        parentId: registration.parentId,
        phase: 'active' satisfies ShadowOverlayPhase,
      });
      this.#moveSubtreeToTop(existing.id);
      return;
    }

    this.#layers.push({
      ...registration,
      dismissible: registration.dismissible ?? true,
      phase: 'active',
    });
  }

  beginExit(id: string): string[] {
    this.#requireLayer(id);
    const exitingLayers = this.#layers
      .filter(
        (layer) =>
          layer.phase === 'active' &&
          (layer.id === id || this.#hasAncestor(layer, id)),
      )
      .reverse();

    for (const layer of exitingLayers) layer.phase = 'exiting';

    return exitingLayers.map((layer) => layer.id);
  }

  requestDismiss(): string | null {
    const owner = this.#owner();
    if (!owner || owner.phase === 'exiting' || !owner.dismissible) return null;
    return owner.id;
  }

  unmount(id: string): ShadowOverlayFocusTarget {
    const layer = this.#requireLayer(id);
    const wasOwner = this.#owner()?.id === id;
    const descendant = this.#layers.find((candidate) => this.#hasAncestor(candidate, id));
    if (descendant) {
      throw new Error(`Cannot unmount overlay "${id}" before descendant "${descendant.id}"`);
    }

    const parentIsExiting = this.#layers.some(
      (candidate) => candidate.id === layer.parentId && candidate.phase === 'exiting',
    );
    this.#layers.splice(this.#layers.indexOf(layer), 1);
    if (parentIsExiting || !wasOwner) return null;

    const { modalOwner, owner } = this.#computeOwnership();
    const parentOwnsFocus = layer.parentId !== undefined && owner?.id === layer.parentId;
    const outerScopeIsActive = layer.parentId === undefined && modalOwner === null;
    const openerTarget: ShadowOverlayFocusTarget = layer.opener?.isConnected
      ? { kind: 'element', element: layer.opener }
      : null;

    if (openerTarget && (owner === null || parentOwnsFocus || outerScopeIsActive)) {
      return openerTarget;
    }
    return owner ? { kind: 'layer', id: owner.id } : openerTarget;
  }

  snapshot(): ShadowOverlaySnapshot {
    const { modalOwner, owner, eligibleIds } = this.#computeOwnership();

    return {
      ownerId: owner?.id ?? null,
      modalOwnerId: modalOwner?.id ?? null,
      backgroundInert: modalOwner !== null,
      layers: this.#layers.map((layer) => ({
        id: layer.id,
        kind: layer.kind,
        parentId: layer.parentId ?? null,
        phase: layer.phase,
        eligible: eligibleIds.has(layer.id),
      })),
    };
  }

  #hasAncestor(layer: ShadowOverlayLayer, ancestorId: string): boolean {
    let parentId = layer.parentId;
    const visited = new Set<string>();
    while (parentId !== undefined && !visited.has(parentId)) {
      if (parentId === ancestorId) return true;
      visited.add(parentId);
      parentId = this.#layers.find((candidate) => candidate.id === parentId)?.parentId;
    }
    return false;
  }

  #moveSubtreeToTop(id: string): void {
    const subtree = this.#layers.filter(
      (layer) => layer.id === id || this.#hasAncestor(layer, id),
    );
    const subtreeIds = new Set(subtree.map((layer) => layer.id));
    const remainingLayers = this.#layers.filter((layer) => !subtreeIds.has(layer.id));
    this.#layers.splice(0, this.#layers.length, ...remainingLayers, ...subtree);
  }

  /** Topmost modal, and topmost layer eligible under it, in one backward pass each. */
  #computeOwnership() {
    const modalOwner = this.#findLastLayer((layer) => layer.kind === 'modal');
    const eligibleIds = new Set(
      this.#layers
        .filter(
          (layer) =>
            modalOwner === null ||
            layer.id === modalOwner.id ||
            this.#hasAncestor(layer, modalOwner.id),
        )
        .map((layer) => layer.id),
    );
    const owner = this.#findLastLayer((layer) => eligibleIds.has(layer.id));
    return { modalOwner, owner, eligibleIds };
  }

  #findLastLayer(predicate: (layer: ShadowOverlayLayer) => boolean): ShadowOverlayLayer | null {
    for (let index = this.#layers.length - 1; index >= 0; index--) {
      const layer = this.#layers[index];
      if (!layer) continue;
      if (predicate(layer)) return layer;
    }
    return null;
  }

  #owner(): ShadowOverlayLayer | null {
    return this.#computeOwnership().owner;
  }

  #requireLayer(id: string): ShadowOverlayLayer {
    const layer = this.#layers.find((candidate) => candidate.id === id);
    if (!layer) throw new Error(`Unknown overlay "${id}"`);
    return layer;
  }
}
