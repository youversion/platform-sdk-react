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
    const exitingIds = this.#layers
      .filter((layer) => layer.id === id || this.#hasAncestor(layer, id))
      .map((layer) => layer.id)
      .reverse();

    for (const exitingId of exitingIds) {
      this.#requireLayer(exitingId).phase = 'exiting';
    }

    return exitingIds;
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
    const snapshot = this.snapshot();
    const parentIsEligible =
      layer.parentId !== undefined &&
      snapshot.layers.some((candidate) => candidate.id === layer.parentId && candidate.eligible);
    if (
      layer.opener.isConnected &&
      (snapshot.modalOwnerId === null || snapshot.ownerId === null || parentIsEligible)
    ) {
      return { kind: 'element', element: layer.opener };
    }
    if (snapshot.ownerId) return { kind: 'layer', id: snapshot.ownerId };
    return layer.opener.isConnected ? { kind: 'element', element: layer.opener } : null;
  }

  snapshot(): ShadowOverlaySnapshot {
    const modalOwner = [...this.#layers].reverse().find((layer) => layer.kind === 'modal') ?? null;
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
    const owner = [...this.#layers].reverse().find((layer) => eligibleIds.has(layer.id)) ?? null;

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

  #owner(): ShadowOverlayLayer | null {
    const ownerId = this.snapshot().ownerId;
    return ownerId ? (this.#layers.find((layer) => layer.id === ownerId) ?? null) : null;
  }

  #requireLayer(id: string): ShadowOverlayLayer {
    const layer = this.#layers.find((candidate) => candidate.id === id);
    if (!layer) throw new Error(`Unknown overlay "${id}"`);
    return layer;
  }
}
