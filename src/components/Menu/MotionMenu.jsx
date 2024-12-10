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
        bgcolor: "background.paper",
        p: "10px 15px",
        borderTop: "1px solid #ddd",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "20vh",
        boxSizing: "border-box",
        borderRadius: "8px 8px 0 0", // 8px corner radius on top
      }}
    >
      <MenuContainer />
    </Paper>
  );
};

export default MotionMenu;
