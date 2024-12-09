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
        bgcolor: "#adadad",
        p: "10px 15px",
        borderTop: "1px solid #ddd",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "20vh", // Occupy 20% of viewport height
        boxSizing: "border-box",
      }}
    >
      <MenuContainer />
    </Paper>
  );
};

export default MotionMenu;
