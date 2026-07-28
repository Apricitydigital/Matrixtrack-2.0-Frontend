"use client";

import React, { useState, useCallback } from "react";
import { Upload, FileText, X, AlertCircle, CheckCircle2, Map } from "lucide-react";

interface KMLUploaderProps {
    onKMLParsed: (data: ParsedKMLData) => void;
    onClose: () => void;
    isDarkMode: boolean;
}

export interface ParsedKMLData {
    name: string;
    coordinates: [number, number][];
    properties: Record<string, any>;
    rawKML: string;
}

export default function KMLUploader({ onKMLParsed, onClose, isDarkMode }: KMLUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);

    const cardColor = isDarkMode ? "#1e293b" : "#ffffff";
    const textColor = isDarkMode ? "#f8fafc" : "#0f172a";
    const borderColor = isDarkMode ? "#334155" : "#e2e8f0";

    const parseKML = (kmlText: string): ParsedKMLData | null => {
        try {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(kmlText, "text/xml");

            // Check for parsing errors
            const parserError = xmlDoc.querySelector("parsererror");
            if (parserError) {
                throw new Error("Invalid KML file format");
            }

            // Extract placemark name
            const placemarkName = xmlDoc.querySelector("Placemark > name")?.textContent || "Unnamed Beat";

            // Extract coordinates from LineString or Polygon
            const coordinatesText =
                xmlDoc.querySelector("LineString > coordinates")?.textContent ||
                xmlDoc.querySelector("Polygon > outerBoundaryIs > LinearRing > coordinates")?.textContent ||
                xmlDoc.querySelector("coordinates")?.textContent;

            if (!coordinatesText) {
                throw new Error("No coordinates found in KML file");
            }

            // Parse coordinates (KML format is: lon,lat,alt or lon,lat)
            const coordinates: [number, number][] = coordinatesText
                .trim()
                .split(/\s+/)
                .map((coord) => {
                    const parts = coord.split(",");
                    if (parts.length < 2) return null;
                    const lat = parseFloat(parts[1]);
                    const lon = parseFloat(parts[0]);
                    if (isNaN(lat) || isNaN(lon)) return null;
                    return [lat, lon] as [number, number];
                })
                .filter((coord): coord is [number, number] => coord !== null);

            if (coordinates.length < 2) {
                throw new Error("Insufficient valid coordinates found");
            }

            // Extract extended data / properties
            const properties: Record<string, any> = {};
            const extendedData = xmlDoc.querySelectorAll("ExtendedData > Data");
            extendedData.forEach((data) => {
                const name = data.getAttribute("name");
                const value = data.querySelector("value")?.textContent;
                if (name && value) {
                    properties[name] = value;
                }
            });

            // Also check for SimpleData in SchemaData
            const simpleData = xmlDoc.querySelectorAll("SchemaData > SimpleData");
            simpleData.forEach((data) => {
                const name = data.getAttribute("name");
                const value = data.textContent;
                if (name && value) {
                    properties[name] = value;
                }
            });

            return {
                name: placemarkName,
                coordinates,
                properties,
                rawKML: kmlText,
            };
        } catch (err) {
            console.error("KML parsing error:", err);
            return null;
        }
    };

    const handleFile = useCallback(async (file: File) => {
        setError(null);
        setIsProcessing(true);
        setUploadedFile(file);

        try {
            // Validate file type
            if (!file.name.toLowerCase().endsWith(".kml")) {
                throw new Error("Please upload a valid KML file");
            }

            // Read file content
            const text = await file.text();

            // Parse KML
            const parsedData = parseKML(text);

            if (!parsedData) {
                throw new Error("Failed to parse KML file. Please check the file format.");
            }

            // Success - send data to parent
            onKMLParsed(parsedData);

        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to process KML file");
            setUploadedFile(null);
        } finally {
            setIsProcessing(false);
        }
    }, [onKMLParsed]);

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            handleFile(files[0]);
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            handleFile(files[0]);
        }
    };

    return (
        <div className="kml-uploader-overlay">
            <div className="kml-uploader-modal" style={{ background: cardColor, color: textColor, borderColor }}>
                <div className="modal-header">
                    <div>
                        <h2 className="modal-title">Upload KML File</h2>
                        <p className="modal-subtitle">Upload a KML file to create a new beat</p>
                    </div>
                    <button onClick={onClose} className="close-btn">
                        <X size={20} />
                    </button>
                </div>

                <div className="modal-body">
                    <div
                        className={`dropzone ${isDragging ? "dragging" : ""} ${uploadedFile ? "uploaded" : ""}`}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        style={{ borderColor: isDragging ? "#3b82f6" : borderColor }}
                    >
                        {isProcessing ? (
                            <div className="processing-state">
                                <div className="spinner"></div>
                                <p className="processing-text">Processing KML file...</p>
                            </div>
                        ) : uploadedFile && !error ? (
                            <div className="success-state">
                                <CheckCircle2 size={48} color="#22c55e" />
                                <p className="success-text">{uploadedFile.name}</p>
                                <p className="success-subtext">KML file successfully uploaded and parsed</p>
                            </div>
                        ) : (
                            <>
                                <Upload size={48} color={isDarkMode ? "#94a3b8" : "#64748b"} />
                                <p className="dropzone-text">Drop KML file here or click to browse</p>
                                <p className="dropzone-subtext">Supports .kml files with LineString or Polygon geometries</p>
                                <input
                                    type="file"
                                    accept=".kml"
                                    onChange={handleFileInput}
                                    className="file-input"
                                    id="kml-file-input"
                                />
                                <label htmlFor="kml-file-input" className="browse-btn">
                                    <FileText size={16} />
                                    Browse Files
                                </label>
                            </>
                        )}
                    </div>

                    {error && (
                        <div className="error-message">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    {!error && !isProcessing && !uploadedFile && (
                        <div className="info-section">
                            <div className="info-item">
                                <Map size={16} />
                                <span>Your KML file should contain road/beat geometry data</span>
                            </div>
                            <div className="info-item">
                                <FileText size={16} />
                                <span>LineString or Polygon formats are supported</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
        .kml-uploader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fadeIn 0.2s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .kml-uploader-modal {
          width: 90%;
          max-width: 600px;
          border: 1px solid;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .modal-header {
          padding: 24px 24px 20px;
          border-bottom: 1px solid rgba(128, 128, 128, 0.1);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 700;
          margin: 0 0 4px;
        }

        .modal-subtitle {
          font-size: 13px;
          opacity: 0.6;
          margin: 0;
        }

        .close-btn {
          background: rgba(128, 128, 128, 0.1);
          border: none;
          padding: 8px;
          border-radius: 8px;
          cursor: pointer;
          color: inherit;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: rgba(128, 128, 128, 0.2);
        }

        .modal-body {
          padding: 24px;
        }

        .dropzone {
          border: 2px dashed;
          border-radius: 12px;
          padding: 48px 24px;
          text-align: center;
          transition: all 0.3s;
          cursor: pointer;
          position: relative;
          background: rgba(128, 128, 128, 0.02);
        }

        .dropzone.dragging {
          background: rgba(59, 130, 246, 0.05);
          border-color: #3b82f6;
          transform: scale(1.02);
        }

        .dropzone.uploaded {
          background: rgba(34, 197, 94, 0.05);
          border-color: #22c55e;
        }

        .dropzone-text {
          font-size: 16px;
          font-weight: 600;
          margin: 16px 0 8px;
        }

        .dropzone-subtext {
          font-size: 13px;
          opacity: 0.6;
          margin: 0 0 20px;
        }

        .file-input {
          display: none;
        }

        .browse-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: #3b82f6;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border: none;
        }

        .browse-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .processing-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid rgba(59, 130, 246, 0.2);
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .processing-text {
          font-size: 15px;
          font-weight: 600;
          margin: 0;
        }

        .success-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .success-text {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
        }

        .success-subtext {
          font-size: 13px;
          opacity: 0.6;
          margin: 0;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          margin-top: 16px;
          font-size: 14px;
          font-weight: 500;
        }

        .info-section {
          margin-top: 20px;
          padding: 16px;
          background: rgba(59, 130, 246, 0.05);
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .info-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 13px;
          color: #3b82f6;
        }
      `}</style>
        </div>
    );
}
