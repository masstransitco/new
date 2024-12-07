import React from "react";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Paper from "@mui/material/Paper";
import MenuContainer from "./MenuContainer";

// Create a deeper dark theme
const darkTheme = createTheme({
  palette: {
    mode: "dark", // Set the mode to dark
    background: {
      paper: "#121212", // Darker color for background.paper
      default: "#000000", // Darker color for background.default
    },
    text: {
      primary: "#ffffff", // Light text color for better contrast
      secondary: "#b0b0b0", // Slightly lighter text for secondary elements
    },
  },
});

const MotionMenu = () => {
  return (
    <Paper
      elevation={4} // Add a slight shadow for depth
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: "background.paper", // Use the darker theme background.paper
        padding: "10px 15px",
        borderTop: "1px solid #333", // Darker top border for better blending
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* MenuContainer holds the car options */}
      <MenuContainer />
    </Paper>
  );
};

// Main App component to wrap MotionMenu with ThemeProvider
const App = () => {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline /> {/* Normalize styles */}
      <MotionMenu />
      {/* Ensure GLB Loader or other components match the background */}
      <div style={{ backgroundColor: darkTheme.palette.background.default, height: '100vh' }}>
        {/* Your GLB Loader or other content goes here */}
      </div>
    </ThemeProvider>
  );
};

export default App;
