// src/components/Home.jsx

import React from "react";
import PropTypes from "prop-types";
import "./Home.css";

const Home = ({ children }) => {
  return <div className="home-container">{children}</div>;
};

Home.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Home;
