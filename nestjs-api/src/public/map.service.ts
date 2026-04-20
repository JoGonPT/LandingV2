import { Injectable } from "@nestjs/common";

import { estimateRouteDistanceKm } from "@/lib/routing/estimate-route-distance-km";

@Injectable()
export class MapService {
  /** OSM + OSRM route distance (km); used by map-aware flows; quote pipeline also resolves distance inside TransferCRM client. */
  estimateRouteDistanceKm(pickup: string, dropoff: string): Promise<number | null> {
    return estimateRouteDistanceKm(pickup, dropoff);
  }
}
