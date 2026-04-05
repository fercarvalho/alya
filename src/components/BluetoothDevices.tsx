import React, { useState } from "react";
import { Bluetooth, BluetoothSearching, RefreshCw, Wifi, AlertCircle } from "lucide-react";
import { API_BASE_URL } from "../config/api";
import { useAuth } from "../contexts/AuthContext";

interface BluetoothDevice {
  id: string;
  address: string;
  addressType: string | null;
  name: string | null;
  rssi: number;
  serviceUuids: string[];
  manufacturerData: string | null;
}

interface ScanResult {
  success: boolean;
  devices: BluetoothDevice[];
  count: number;
  duration: number;
  scannedAt: string;
  error?: string;
}

function rssiToLabel(rssi: number): { label: string; color: string } {
  if (rssi >= -60) return { label: "Forte", color: "text-emerald-600" };
  if (rssi >= -75) return { label: "Médio", color: "text-amber-500" };
  if (rssi >= -90) return { label: "Fraco", color: "text-orange-500" };
  return { label: "Muito fraco", color: "text-red-500" };
}

function rssiToBars(rssi: number): number {
  if (rssi >= -60) return 4;
  if (rssi >= -75) return 3;
  if (rssi >= -90) return 2;
  return 1;
}

const BluetoothDevices: React.FC = () => {
  const { token } = useAuth();
  const [devices, setDevices] = useState<BluetoothDevice[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scannedAt, setScannedAt] = useState<string | null>(null);
  const [duration, setDuration] = useState(5);
  const [hasScanned, setHasScanned] = useState(false);

  const scan = async () => {
    setIsScanning(true);
    setError(null);

    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const response = await fetch(
        `${API_BASE_URL}/bluetooth/devices?duration=${duration * 1000}`,
        { headers }
      );
      const result: ScanResult = await response.json();

      if (result.success) {
        setDevices(result.devices);
        setScannedAt(result.scannedAt);
        setHasScanned(true);
      } else {
        setError(result.error || "Erro desconhecido ao escanear");
        setDevices([]);
      }
    } catch (e: any) {
      setError("Falha ao comunicar com o servidor");
      setDevices([]);
    } finally {
      setIsScanning(false);
    }
  };

  const sortedDevices = [...devices].sort((a, b) => b.rssi - a.rssi);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-3 mb-2">
          <Bluetooth className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Dispositivos Bluetooth</h1>
        </div>
        <p className="text-blue-100 text-sm">
          Escaneia dispositivos Bluetooth Low Energy (BLE) próximos ao servidor.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Duração do scan:
            </label>
            <select
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={isScanning}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value={3}>3 segundos</option>
              <option value={5}>5 segundos</option>
              <option value={10}>10 segundos</option>
              <option value={15}>15 segundos</option>
            </select>
          </div>

          <button
            onClick={scan}
            disabled={isScanning}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium px-5 py-2 rounded-lg transition-colors shadow-sm"
          >
            {isScanning ? (
              <>
                <BluetoothSearching className="h-4 w-4 animate-pulse" />
                Escaneando…
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Escanear agora
              </>
            )}
          </button>

          {scannedAt && !isScanning && (
            <p className="text-xs text-gray-400 ml-auto">
              Último scan:{" "}
              {new Date(scannedAt).toLocaleTimeString("pt-BR")}
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
          <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-sm">Erro ao escanear</p>
            <p className="text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Scanning progress */}
      {isScanning && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
          <BluetoothSearching className="h-12 w-12 text-blue-500 mx-auto mb-3 animate-pulse" />
          <p className="text-blue-700 font-medium">Procurando dispositivos…</p>
          <p className="text-blue-500 text-sm mt-1">
            Aguarde {duration} segundo{duration !== 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Results */}
      {!isScanning && hasScanned && !error && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">
              {sortedDevices.length > 0
                ? `${sortedDevices.length} dispositivo${sortedDevices.length !== 1 ? "s" : ""} encontrado${sortedDevices.length !== 1 ? "s" : ""}`
                : "Nenhum dispositivo encontrado"}
            </h2>
          </div>

          {sortedDevices.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center text-gray-500">
              <Bluetooth className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Nenhum dispositivo BLE detectado</p>
              <p className="text-sm mt-1">
                Certifique-se de que há dispositivos Bluetooth ativos próximos ao servidor.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {sortedDevices.map((device) => {
                const signal = rssiToLabel(device.rssi);
                const bars = rssiToBars(device.rssi);
                return (
                  <div
                    key={device.address}
                    className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2.5 rounded-lg flex-shrink-0">
                          <Bluetooth className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            {device.name || (
                              <span className="text-gray-400 italic">Sem nome</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {device.address}
                          </p>
                        </div>
                      </div>

                      {/* Signal bars */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <div className="flex items-end gap-0.5 h-5">
                          {[1, 2, 3, 4].map((b) => (
                            <div
                              key={b}
                              className={`w-1.5 rounded-sm ${
                                b <= bars ? "bg-blue-500" : "bg-gray-200"
                              }`}
                              style={{ height: `${b * 25}%` }}
                            />
                          ))}
                        </div>
                        <p className={`text-xs font-medium ${signal.color}`}>
                          {device.rssi} dBm · {signal.label}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
                      {device.addressType && (
                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">
                          {device.addressType}
                        </span>
                      )}
                      {device.serviceUuids.length > 0 && (
                        <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">
                          {device.serviceUuids.length} serviço{device.serviceUuids.length !== 1 ? "s" : ""}
                        </span>
                      )}
                      {device.manufacturerData && (
                        <span
                          className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-mono truncate max-w-[180px]"
                          title={device.manufacturerData}
                        >
                          {device.manufacturerData}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BluetoothDevices;
