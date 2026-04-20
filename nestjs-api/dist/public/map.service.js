"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapService = void 0;
const common_1 = require("@nestjs/common");
const estimate_route_distance_km_1 = require("../../../src/lib/routing/estimate-route-distance-km");
let MapService = class MapService {
    estimateRouteDistanceKm(pickup, dropoff) {
        return (0, estimate_route_distance_km_1.estimateRouteDistanceKm)(pickup, dropoff);
    }
};
exports.MapService = MapService;
exports.MapService = MapService = __decorate([
    (0, common_1.Injectable)()
], MapService);
//# sourceMappingURL=map.service.js.map