"""
Structural connectivity analysis and automatic bridging of separated fuse bead parts.

In physical fuse bead crafting (hot melt boards), every bead in the final piece must belong
to a single 4-connected (orthogonal) component. Parts that are completely separated by empty
pegs—or that only touch diagonally—will fall apart when lifted off the pegboard after ironing.
"""

from collections import deque
from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class ConnectivityResult:
    grid: list[list[Optional[int]]]
    initial_components: int
    final_components: int
    bridge_beads_added: int


def find_orthogonal_components(
    grid: list[list[Optional[int]]],
) -> list[list[tuple[int, int]]]:
    """
    Find all 4-connected (orthogonal) components of occupied cells in the bead grid.
    Returns a list of components sorted by size descending (largest component first).
    """
    h = len(grid)
    w = len(grid[0]) if h > 0 else 0
    visited = [[False] * w for _ in range(h)]
    components: list[list[tuple[int, int]]] = []

    for r in range(h):
        for c in range(w):
            if grid[r][c] is not None and not visited[r][c]:
                comp: list[tuple[int, int]] = []
                queue: deque[tuple[int, int]] = deque([(r, c)])
                visited[r][c] = True
                while queue:
                    cr, cc = queue.popleft()
                    comp.append((cr, cc))
                    for dr, dc in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                        nr, nc = cr + dr, cc + dc
                        if (
                            0 <= nr < h
                            and 0 <= nc < w
                            and not visited[nr][nc]
                            and grid[nr][nc] is not None
                        ):
                            visited[nr][nc] = True
                            queue.append((nr, nc))
                components.append(comp)

    components.sort(key=len, reverse=True)
    return components


def _build_orthogonal_bridge_path(
    start: tuple[int, int],
    end: tuple[int, int],
) -> list[tuple[int, int]]:
    """
    Generate a continuous 4-connected (orthogonal step-by-step) path of grid coordinates
    between `start` and `end`. Every consecutive pair in the path shares an edge (Manhattan dist = 1).
    """
    r, c = start
    er, ec = end
    path: list[tuple[int, int]] = []

    while (r, c) != (er, ec):
        dr = er - r
        dc = ec - c
        # Step along the axis with the larger remaining distance to follow the shortest diagonal line
        # while strictly taking 4-connected orthogonal steps
        if abs(dr) >= abs(dc):
            r += 1 if dr > 0 else -1
        else:
            c += 1 if dc > 0 else -1
        path.append((r, c))

    return path


def connect_separated_parts(
    grid: list[list[Optional[int]]],
    bridge_color_id: int = 0,
    enable_bridge: bool = True,
    max_single_speck_distance: int = 6,
) -> ConnectivityResult:
    """
    Ensure all separated parts of the fuse bead pattern are physically connected into
    a single 4-connected (orthogonal) structure:
    1. Detects all 4-connected components.
    2. Removes isolated 1-bead background noise specks that are far from the main figure.
    3. Bridges all remaining separated parts (floating accessories, detached limbs, diagonal-only
       joints) to the main body via shortest 4-connected orthogonal paths using `bridge_color_id`.
    """
    if not grid or not grid[0]:
        return ConnectivityResult(
            grid=grid,
            initial_components=0,
            final_components=0,
            bridge_beads_added=0,
        )

    out = [row[:] for row in grid]
    raw_components = find_orthogonal_components(out)
    if len(raw_components) <= 1:
        count = len(raw_components)
        return ConnectivityResult(
            grid=out,
            initial_components=count,
            final_components=count,
            bridge_beads_added=0,
        )

    if not enable_bridge:
        count = len(raw_components)
        return ConnectivityResult(
            grid=out,
            initial_components=count,
            final_components=count,
            bridge_beads_added=0,
        )

    # Step 1: Prune distant 1-bead stray specks (noise) while keeping nearby parts
    main_comp = raw_components[0]
    for comp in raw_components[1:]:
        if len(comp) == 1:
            sr, sc = comp[0]
            min_dist = min(abs(sr - mr) + abs(sc - mc) for mr, mc in main_comp)
            if min_dist > max_single_speck_distance:
                out[sr][sc] = None

    components = find_orthogonal_components(out)
    initial_count = len(components)
    if initial_count <= 1:
        return ConnectivityResult(
            grid=out,
            initial_components=initial_count,
            final_components=initial_count,
            bridge_beads_added=0,
        )

    bridge_beads_added = 0
    h = len(out)
    w = len(out[0])

    # Step 2: Iteratively connect the closest disconnected island to the main component (MST style)
    while len(components) > 1:
        main_cells = components[0]
        other_cells: list[tuple[int, int]] = [
            cell for comp in components[1:] for cell in comp
        ]

        best_start: tuple[int, int] = main_cells[0]
        best_end: tuple[int, int] = other_cells[0]
        best_dist_sq: int = 10**9

        for mr, mc in main_cells:
            for orow, ocol in other_cells:
                d_sq = (mr - orow) ** 2 + (mc - ocol) ** 2
                if d_sq < best_dist_sq:
                    best_dist_sq = d_sq
                    best_start = (mr, mc)
                    best_end = (orow, ocol)

        bridge_path = _build_orthogonal_bridge_path(best_start, best_end)
        new_bridge_coords: list[tuple[int, int]] = []
        for br, bc in bridge_path:
            if out[br][bc] is None:
                out[br][bc] = bridge_color_id
                bridge_beads_added += 1
                new_bridge_coords.append((br, bc))

        # If the bridge spans >= 2 empty beads, widen the bridge by 1 adjacent orthogonal bead
        # where possible so long bridges don't snap when ironed
        if len(new_bridge_coords) >= 2:
            for br, bc in new_bridge_coords:
                # Add a support bead adjacent to the bridge cell if within bounds and touching the bridge
                dr = abs(best_end[0] - best_start[0])
                dc = abs(best_end[1] - best_start[1])
                # Widen perpendicular to the primary bridge direction
                perp_r, perp_c = (br, bc + 1) if dr >= dc else (br + 1, bc)
                if 0 <= perp_r < h and 0 <= perp_c < w and out[perp_r][perp_c] is None:
                    out[perp_r][perp_c] = bridge_color_id
                    bridge_beads_added += 1

        components = find_orthogonal_components(out)

    return ConnectivityResult(
        grid=out,
        initial_components=initial_count,
        final_components=len(components),
        bridge_beads_added=bridge_beads_added,
    )
