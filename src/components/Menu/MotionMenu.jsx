import React from "react";
import Paper from "@mui/material/Paper";
import MenuContainer from "./MenuContainer";

const MotionMenu = () => {
  return (
    <Paper
      elevation={4} // Add a slight shadow for depth
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: "background.paper",
        padding: "10px 15px",
        borderTop: "1px solid #ddd", // Add a top border
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

export default MotionMenu;
