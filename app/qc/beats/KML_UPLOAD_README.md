# KML Upload Feature for Beat Management

This feature allows city administrators to upload KML files to create new beats with geographical data.

## Overview

The KML upload feature is integrated into the Beat Management module (`/qc/beats`) and provides:

1. **KML File Upload** - Drag-and-drop or browse to upload KML files
2. **Map Visualization** - Uploaded KML data is displayed on the map with a distinctive purple color
3. **Beat Preview Panel** - Shows detailed information about the uploaded beat at the bottom of the screen
4. **Save Functionality** - Save button to persist the beat to the database

## Components

### 1. KMLUploader Component
**Location:** `/app/qc/beats/components/KMLUploader.tsx`

- Modal dialog for uploading KML files
- Drag-and-drop support
- File validation (.kml extension)
- KML parsing with support for:
  - LineString geometries
  - Polygon geometries
  - Extended data properties
  - Simple data properties
- Real-time parsing feedback

### 2. BeatPreviewPanel Component
**Location:** `/app/qc/beats/components/BeatPreviewPanel.tsx`

- Fixed bottom panel showing uploaded beat information
- Displays:
  - Beat name
  - Number of coordinate points
  - Calculated distance
  - KML properties
  - Coordinate preview
- Action buttons:
  - **Save Beat** - Saves the beat (currently shows alert, needs backend integration)
  - **Cancel** - Discards the uploaded data

## How to Use

### For Users

1. **Navigate to Beats Management**
   - Go to `/qc/beats` page
   - Login as QC role

2. **Upload KML File**
   - Click the "Upload KML" button in the header
   - Either drag-and-drop a KML file or click "Browse Files"
   - Wait for the file to be parsed

3. **Review on Map**
   - The uploaded beat appears on the map in **purple** with a glow effect
   - Click on the beat to see a popup with details
   - The beat automatically centers in view

4. **Review Beat Information**
   - Bottom panel shows:
     - Beat name from KML
     - Number of coordinate points
     - Total distance calculated
     - Any properties from the KML file
     - Preview of coordinates

5. **Save or Cancel**
   - Click "Save Beat" to save to database
   - Click "Cancel" to discard the upload

### Testing with Sample KML

A sample KML file is provided at: `/app/qc/beats/sample-beat.kml`

This file contains:
- A sample beat in Gachibowli area
- Extended data properties (ward, zone, length)
- 8 coordinate points forming a road

## KML File Format

### Supported Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <Placemark>
      <name>Beat Name</name>
      <description>Optional description</description>
      <ExtendedData>
        <Data name="property1">
          <value>value1</value>
        </Data>
      </ExtendedData>
      <LineString>
        <coordinates>
          lon1,lat1,alt1
          lon2,lat2,alt2
          ...
        </coordinates>
      </LineString>
    </Placemark>
  </Document>
</kml>
```

### Coordinate Format

- Format: `longitude,latitude,altitude`
- Altitude is optional
- At least 2 coordinate points required
- Example: `78.3500,17.4400,0`

### Supported Geometry Types

1. **LineString** - For road/path beats
2. **Polygon** - For area beats (uses outer boundary)

## Technical Details

### State Management

The feature uses React hooks for state management:

```typescript
const [showKMLUploader, setShowKMLUploader] = useState(false);
const [uploadedKMLData, setUploadedKMLData] = useState<ParsedKMLData | null>(null);
const [tempBeatOnMap, setTempBeatOnMap] = useState<any>(null);
```

### KML Parsing

The KML parser extracts:
- Placemark name
- Coordinates (converted from lon,lat to lat,lon for Leaflet)
- Extended data properties
- Simple data properties

### Map Rendering

Uploaded beats are rendered with:
- Purple color (#8b5cf6)
- Glow effect with animation
- Higher opacity for visibility
- Clickable popup

### Distance Calculation

Uses Haversine formula to calculate total distance between coordinate points.

## Backend Integration (TODO)

The `handleSaveBeat` function currently shows an alert. To integrate with backend:

1. Create API endpoint: `POST /api/beats`
2. Send beat data:
   ```typescript
   {
     name: string,
     coordinates: [number, number][],
     properties: Record<string, any>,
     ward?: string,
     zone?: string,
     // other fields...
   }
   ```
3. Handle response and update UI
4. Add beat to `mockBeats` or fetch updated list

## Styling

### Upload Button
- Purple gradient background
- Located in header between search and theme toggle
- Hover effect with elevation

### KML on Map
- Purple color (#8b5cf6)
- Animated glow effect
- Wider stroke (6px) for visibility
- Popup shows "📤 Uploaded - Ready to Save"

### Preview Panel
- Fixed position at bottom
- Slide-up animation
- Responsive design
- Prominent "Save Beat" button with gradient

## Future Enhancements

1. **Multi-file Upload** - Upload multiple KML files at once
2. **Batch Import** - Import multiple placemarks from a single KML
3. **Edit After Upload** - Allow editing beat properties before saving
4. **Validation** - Additional validation for coordinate ranges, beat overlap
5. **Export** - Export existing beats as KML files
6. **Map Drawing** - Draw beats directly on the map instead of uploading KML
7. **Ward/Zone Auto-detection** - Automatically assign ward/zone based on coordinates

## Known Limitations

1. Only supports single Placemark per KML file
2. Altitude data is ignored
3. No validation for coordinate ranges (could be outside service area)
4. No duplicate beat detection
5. Limited error messages for malformed KML files

## Error Handling

The component handles:
- Invalid file extensions
- Malformed XML
- Missing coordinates
- Insufficient coordinate points (< 2)
- XML parsing errors

## Browser Compatibility

- Tested on modern browsers with File API support
- Uses DOMParser for XML parsing (widely supported)
- CSS animations supported in all modern browsers
