# Russian Political Prisoners Map

An interactive web application for exploring reported cases of political imprisonment in Russia through geographic visualization.

**[Live Demo](https://russian-political-prisoners-map.onrender.com/)**

## Overview

This project was originally developed as part of a university course at Case Western Reserve University. The goal was to create an interactive web application that visualizes reported cases of political imprisonment in Russia, allowing users to explore cases by location and access information about individual prisoners, including their backgrounds, legal proceedings, and sentences.

The application uses a JavaScript frontend with Leaflet for map visualization and a Node.js/Express backend for processing and serving the data.

## Features

- **Interactive map:** Explore reported cases across cities and regions.
- **Location-based grouping:** Markers display the number of cases associated with each geographic location, preventing overlapping markers.
- **Individual case profiles:** Select a location to browse the associated individuals and view their case information.
- **Detailed records:** Access information about criminal charges, sentences, imprisonment status, and case descriptions.
- **Responsive interface:** Dark-themed map with interactive navigation and a case details panel.

## Tech Stack

- **Frontend:** JavaScript, HTML, CSS, Vite
- **Backend:** Node.js, Express
- **Mapping:** Leaflet.js
- **HTTP Requests:** Axios
- **Deployment:** Render
- **Version Control:** Git, GitHub

## How It Works

1. The Express backend reads a local JSON dataset containing reported cases of political imprisonment.
2. Records with available geographic coordinates are returned through the `/api/map` endpoint.
3. Records sharing the same coordinates are grouped into numbered markers using Leaflet.
4. Selecting a location displays a list of associated individuals.
5. The `/api/prisoner/:id` endpoint retrieves detailed information about a selected case.

## Data Source

The project uses a dataset published by [ODINT](https://odint.io/).

**[Original Dataset](https://odint.io/data/russia/data_imprisoned_detailed.json)**

The dataset contains 2,181 records, of which 1,718 were assigned approximate geographic coordinates for visualization.

Coordinates represent reported cities or regional reference points, not verified detention locations. Records without sufficiently reliable geographic information are excluded from the map.

The application uses a static dataset snapshot rather than continuously updated information.

## Running Locally

Clone the repository:

```bash
git clone https://github.com/sofia-popov/russian-political-prisoners-map.git
cd russian-political-prisoners-map/RussianPoliticalPrisoners
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

To run the Express backend:

```bash
npm start
```

The frontend uses the `/api/map` and `/api/prisoner/:id` endpoints provided by the backend. Running the development server alone may require additional proxy configuration for API requests.

## Limitations

- Geographic locations are approximate and should not be interpreted as exact detention facilities.
- Records without sufficient location information are not displayed.
- The dataset represents a snapshot and may not reflect subsequent changes in individuals' legal or detention status.
- Data completeness and accuracy depend on the original source.

## Author

**Sofia Popov**  
Computer Science, Artificial Intelligence & Mathematics  
Case Western Reserve University
