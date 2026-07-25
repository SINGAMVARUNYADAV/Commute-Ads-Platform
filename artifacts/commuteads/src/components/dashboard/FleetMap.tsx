import { useEffect } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Battery, Zap, TriangleAlert as AlertTriangle, MonitorPlay } from "lucide-react"

// Fix Leaflet's default icon path issues
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

const createCustomIcon = (status: string, hasSos: boolean) => {
  let color = "#4b5563" // gray/offline
  if (hasSos) color = "#ef4444" // red
  else if (status === "ACTIVE") color = "#22c55e" // green
  
  const markerHtmlStyles = `
    background-color: ${color};
    width: 1rem;
    height: 1rem;
    display: block;
    left: -0.5rem;
    top: -0.5rem;
    position: relative;
    border-radius: 3rem 3rem 0;
    transform: rotate(45deg);
    border: 1px solid #1f2937;
    ${hasSos ? "animation: pulse 1.5s infinite;" : ""}
  `
  
  return L.divIcon({
    className: "my-custom-pin",
    iconAnchor: [0, 12],
    popupAnchor: [0, -18],
    html: `<span style="${markerHtmlStyles}" />`
  })
}

// Ensure map resizes correctly
function MapEffect() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => {
      map.invalidateSize()
    }, 100)
  }, [map])
  return null
}

export function FleetMap({ devices }: { devices: any[] }) {
  // Center on Hyderabad
  const position: [number, number] = [17.3850, 78.4867]

  return (
    <div className="h-[400px] w-full rounded-md border border-card-border overflow-hidden relative z-0">
      <MapContainer 
        center={position} 
        zoom={11} 
        scrollWheelZoom={true}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        {devices?.map((device) => (
          <Marker 
            key={device.id} 
            position={[device.currentLat, device.currentLng]}
            icon={createCustomIcon(device.screenStatus, !!device.hasSosAlert)}
          >
            <Popup className="map-popup">
              <div className="flex flex-col gap-2 min-w-[200px] font-mono">
                <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                  <span className="font-heading font-bold text-primary">{device.nodeCode}</span>
                  {device.hasSosAlert && (
                    <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded flex items-center gap-1 animate-pulse">
                      <AlertTriangle className="w-3 h-3" /> SOS
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <Battery className="w-3 h-3" /> Battery
                    </span>
                    <span className="flex items-center gap-1">
                      {device.batteryPct}%
                      {device.isCharging && <Zap className="w-3 h-3 text-yellow-500" />}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1">
                      <MonitorPlay className="w-3 h-3" /> Status
                    </span>
                    <span className={device.screenStatus === 'ACTIVE' ? 'text-green-400' : 'text-yellow-400'}>
                      {device.screenStatus}
                    </span>
                  </div>
                  {device.currentlyPlaying && (
                    <div className="mt-2 pt-2 border-t border-primary/20 text-xs break-words text-primary/80 line-clamp-2">
                      Now: {device.currentlyPlaying}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
        <MapEffect />
      </MapContainer>
    </div>
  )
}
