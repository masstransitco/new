import React from "react";
import Paper from "@mui/material/Paper";
import MenuContainer from "./MenuContainer";

const MotionMenu = () => {
  return (
    <Paper
      elevation={4}
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        bgcolor: "#adadad", // Set background color to #adadad
        p: "10px 15px",
        borderTop: "1px solid #ddd",
        display: "flex",
        justifyContent: "space-between", // Distributes space evenly between items
        alignItems: "center",
        height: "18vh", // Occupy 20% of viewport height
        boxSizing: "border-box",
        px: 2, // Add horizontal padding for equal space from left and right
      }}
    >
      <MenuContainer />
    </Paper>
  );
};

export default MotionMenu;
