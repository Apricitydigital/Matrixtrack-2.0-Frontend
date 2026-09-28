export interface BeatPointCoord {
    lat: number;
    lng: number;
    code?: string;
    name?: string;
}

/**
 * Returns a Google Maps URL for opening the Beat route or area.
 * If points (P1..P5) exist, it creates a Google Maps directions route URL.
 * If geometry exists without explicit points, it extracts coordinates to create a directions URL.
 * Fallback: Search query by Beat Name & Ward/Zone.
 */
export function getBeatGoogleMapsUrl(beat: any): string | null {
    if (!beat) return null;

    const validPoints: BeatPointCoord[] = [];

    // 1. Extract valid lat/lng from beat.points
    const rawPoints = Array.isArray(beat.points) ? beat.points : [];
    rawPoints.forEach((p: any, idx: number) => {
        const lat = Number(p?.latitude ?? p?.lat);
        const lng = Number(p?.longitude ?? p?.lng ?? p?.lon);
        if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
            validPoints.push({
                lat,
                lng,
                code: p?.code || `P${idx + 1}`,
                name: p?.name || `Point ${idx + 1}`
            });
        }
    });

    // 2. Fallback to extracting coordinates from beat.geometry
    if (validPoints.length === 0 && beat.geometry) {
        let geom = beat.geometry;
        if (typeof geom === "string") {
            try { geom = JSON.parse(geom); } catch { }
        }

        const extractCoords = (g: any): Array<[number, number]> => {
            if (!g) return [];
            if (g.type === "FeatureCollection") {
                return (g.features || []).flatMap((f: any) => extractCoords(f.geometry));
            }
            if (g.type === "Feature") {
                return extractCoords(g.geometry);
            }
            if (g.type === "LineString" || g.type === "MultiPoint") {
                return g.coordinates || [];
            }
            if (g.type === "Polygon" || g.type === "MultiLineString") {
                return (g.coordinates || []).flat(1);
            }
            if (g.type === "Point") {
                return [g.coordinates];
            }
            return [];
        };

        const coords = extractCoords(geom);
        coords.forEach(([lng, lat], idx) => {
            if (typeof lat === "number" && typeof lng === "number" && Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
                validPoints.push({ lat, lng, code: `P${idx + 1}` });
            }
        });
    }

    // 3. If no valid coordinates found, search Google Maps by location text
    if (validPoints.length === 0) {
        const searchTerms = [beat.beatName, beat.wardName, beat.zoneName, beat.areaName, "India"]
            .filter(Boolean)
            .join(", ");
        if (searchTerms) {
            return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchTerms)}`;
        }
        return null;
    }

    // 4. Single point
    if (validPoints.length === 1) {
        const p = validPoints[0];
        return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
    }

    // 5. Multiple points -> Create Google Maps directions URL (P1 -> P2... -> PN)
    const origin = `${validPoints[0].lat},${validPoints[0].lng}`;
    const destination = `${validPoints[validPoints.length - 1].lat},${validPoints[validPoints.length - 1].lng}`;

    let waypointsParam = "";
    if (validPoints.length > 2) {
        const intermediate = validPoints.slice(1, validPoints.length - 1).slice(0, 20);
        waypointsParam = `&waypoints=${intermediate.map(p => `${p.lat},${p.lng}`).join("|")}`;
    }

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=driving`;
}

/**
 * Returns a Google Maps search URL for a single lat/lng coordinate.
 */
export function getPointGoogleMapsUrl(lat: number, lng: number): string | null {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
        return null;
    }
    return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
