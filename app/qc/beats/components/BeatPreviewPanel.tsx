"use client";

import React from "react";
import { MapPin, Layers, Navigation, FileText, Save, X } from "lucide-react";
import { ParsedKMLData } from "./KMLUploader";

interface BeatPreviewPanelProps {
    kmlData: ParsedKMLData;
    onSave: () => void;
    onCancel: () => void;
    isDarkMode: boolean;
}

export default function BeatPreviewPanel({ kmlData, onSave, onCancel, isDarkMode }: BeatPreviewPanelProps) {
    const cardColor = isDarkMode ? "#1e293b" : "#ffffff";
    const textColor = isDarkMode ? "#f8fafc" : "#0f172a";
    const borderColor = isDarkMode ? "#334155" : "#e2e8f0";

    const calculateDistance = (coords: [number, number][]) => {
        let totalDistance = 0;
        for (let i = 0; i < coords.length - 1; i++) {
            const [lat1, lon1] = coords[i];
            const [lat2, lon2] = coords[i + 1];

            // Haversine formula for distance calculation
            const R = 6371; // Earth's radius in km
            const dLat = (lat2 - lat1) * Math.PI / 180;
            const dLon = (lon2 - lon1) * Math.PI / 180;
            const a =
                Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            totalDistance += R * c;
        }
        return (totalDistance * 1000).toFixed(0); // Return in meters
    };

    const distance = calculateDistance(kmlData.coordinates);

    return (
        <div className="beat-preview-panel" style={{ background: cardColor, color: textColor, borderColor }}>
            <div className="panel-content">
                {/* Left Side: Beat Information */}
                <div className="beat-info">
                    <div className="info-header">
                        <div className="header-icon">
                            <MapPin size={20} color="#3b82f6" />
                        </div>
                        <div>
                            <h3 className="beat-name">{kmlData.name}</h3>
                            <p className="beat-status">Ready to save as new beat</p>
                        </div>
                    </div>

                    <div className="info-grid">
                        <div className="info-card">
                            <div className="info-icon">
                                <Navigation size={16} />
                            </div>
                            <div>
                                <div className="info-label">Coordinates</div>
                                <div className="info-value">{kmlData.coordinates.length} points</div>
                            </div>
                        </div>

                        <div className="info-card">
                            <div className="info-icon">
                                <Layers size={16} />
                            </div>
                            <div>
                                <div className="info-label">Distance</div>
                                <div className="info-value">{distance} m</div>
                            </div>
                        </div>

                        {Object.keys(kmlData.properties).length > 0 && (
                            <div className="info-card full-width">
                                <div className="info-icon">
                                    <FileText size={16} />
                                </div>
                                <div className="properties-list">
                                    <div className="info-label">Properties</div>
                                    {Object.entries(kmlData.properties).map(([key, value]) => (
                                        <div key={key} className="property-item">
                                            <span className="property-key">{key}:</span>
                                            <span className="property-value">{String(value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="coordinate-preview">
                        <div className="preview-header">
                            <span className="preview-title">Coordinate Preview</span>
                            <span className="preview-badge">{kmlData.coordinates.length} points</span>
                        </div>
                        <div className="coordinate-list">
                            {kmlData.coordinates.slice(0, 3).map((coord, idx) => (
                                <div key={idx} className="coordinate-item">
                                    <span className="coord-index">#{idx + 1}</span>
                                    <span className="coord-value">
                                        {coord[0].toFixed(6)}, {coord[1].toFixed(6)}
                                    </span>
                                </div>
                            ))}
                            {kmlData.coordinates.length > 3 && (
                                <div className="coordinate-more">
                                    ... and {kmlData.coordinates.length - 3} more points
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Side: Action Buttons */}
                <div className="action-section">
                    <button onClick={onSave} className="save-btn">
                        <Save size={18} />
                        Save Beat
                    </button>
                    <button onClick={onCancel} className="cancel-btn">
                        <X size={18} />
                        Cancel
                    </button>
                </div>
            </div>

            <style jsx>{`
        .beat-preview-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          border-top: 1px solid;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          animation: slideInUp 0.3s ease-out;
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .panel-content {
          max-width: 1600px;
          margin: 0 auto;
          padding: 24px;
          display: flex;
          gap: 24px;
          align-items: flex-start;
        }

        .beat-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .info-header {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-icon {
          width: 40px;
          height: 40px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .beat-name {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }

        .beat-status {
          font-size: 12px;
          opacity: 0.6;
          margin: 4px 0 0;
        }

        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
        }

        .info-card {
          background: rgba(128, 128, 128, 0.05);
          padding: 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .info-card.full-width {
          grid-column: 1 / -1;
        }

        .info-icon {
          width: 32px;
          height: 32px;
          background: rgba(59, 130, 246, 0.1);
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #3b82f6;
          flex-shrink: 0;
        }

        .info-label {
          font-size: 11px;
          text-transform: uppercase;
          opacity: 0.6;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .info-value {
          font-size: 16px;
          font-weight: 700;
        }

        .properties-list {
          flex: 1;
        }

        .property-item {
          display: flex;
          gap: 8px;
          font-size: 12px;
          margin-top: 4px;
        }

        .property-key {
          font-weight: 600;
          opacity: 0.7;
        }

        .property-value {
          font-weight: 500;
        }

        .coordinate-preview {
          background: rgba(128, 128, 128, 0.05);
          padding: 16px;
          border-radius: 8px;
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .preview-title {
          font-size: 12px;
          text-transform: uppercase;
          font-weight: 600;
          opacity: 0.6;
        }

        .preview-badge {
          background: #3b82f6;
          color: white;
          font-size: 10px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 4px;
        }

        .coordinate-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .coordinate-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }

        .coord-index {
          background: rgba(59, 130, 246, 0.1);
          color: #3b82f6;
          padding: 2px 8px;
          border-radius: 4px;
          font-weight: 700;
          font-size: 10px;
        }

        .coord-value {
          opacity: 0.8;
        }

        .coordinate-more {
          font-size: 11px;
          opacity: 0.5;
          font-style: italic;
          margin-top: 4px;
        }

        .action-section {
          display: flex;
          flex-direction: column;
          gap: 12px;
          min-width: 200px;
        }

        .save-btn {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          color: white;
          border: none;
          padding: 14px 24px;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.2s;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .save-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
        }

        .save-btn:active {
          transform: translateY(0);
        }

        .cancel-btn {
          background: rgba(128, 128, 128, 0.1);
          color: inherit;
          border: 1px solid rgba(128, 128, 128, 0.2);
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .cancel-btn:hover {
          background: rgba(128, 128, 128, 0.15);
        }

        @media (max-width: 768px) {
          .panel-content {
            flex-direction: column;
          }

          .action-section {
            width: 100%;
            flex-direction: row;
          }

          .info-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
        </div>
    );
}
