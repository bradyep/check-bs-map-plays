# check-bs-map-plays

Easily track plays on your Beat Saber custom maps

This project is a Node.js console application that retrieves new plays of a specific map from the BeatLeader API since the last execution.

## Project Structure

```
node-console-app
├── src
│   ├── index.js        # Entry point of the application
│   └── utils
│       └── api.js     # Utility functions for API calls
├── package.json        # npm configuration file
└── README.md           # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd node-console-app
   ```

2. Install the dependencies:
   ```
   npm install
   ```

## Usage

To run the application, use the following command:
```
node src/index.js
```

Make sure to replace `<map-id>` in the code with the actual map ID you want to track.

## Configuration

The application retrieves the last execution timestamp from a local file. Ensure that this file exists and contains a valid timestamp in milliseconds.

## Dependencies

- `axios`: For making HTTP requests to the BeatLeader API.

## License

This project is licensed under the MIT License.
