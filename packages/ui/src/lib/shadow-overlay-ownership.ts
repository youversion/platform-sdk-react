export type ShadowOverlayKind = 'modal' | 'nonmodal';
export type ShadowOverlayPhase = 'active' | 'exiting';

export interface ShadowOverlayRegistration {
  id: string;
  kind: ShadowOverlayKind;
  opener: HTMLElement;
  parentId?: string;
  dismissible?: boolean;
}

export type ShadowOverlayFocusTarget =
  | { kind: 'element'; element: HTMLElement }
  | { kind: 'layer'; id: string }
  | null;

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
    if (existing) {
      existing.phase = 'active';
      return;
    }

    if (
      registration.parentId !== undefined &&
      !this.#layers.some((layer) => layer.id === registration.parentId)
    ) {
      throw new Error(
        `Cannot mount overlay "${registration.id}" with missing parent "${registration.parentId}"`,
      );
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
      .filter((layer) => layer.id === id || this.#hasAncestor(layer, id))
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
    const descendant = this.#layers.find((candidate) => this.#hasAncestor(candidate, id));
    if (descendant) {
      throw new Error(`Cannot unmount overlay "${id}" before descendant "${descendant.id}"`);
    }

    this.#layers.splice(this.#layers.indexOf(layer), 1);
    const { modalOwner, owner, eligibleIds } = this.#computeOwnership();
    const parentIsEligible = layer.parentId !== undefined && eligibleIds.has(layer.parentId);
    const openerTarget: ShadowOverlayFocusTarget = layer.opener.isConnected
      ? { kind: 'element', element: layer.opener }
      : null;

    if (openerTarget && (modalOwner === null || owner === null || parentIsEligible)) {
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
