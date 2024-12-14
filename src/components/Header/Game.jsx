import React from "react";
import { Modal, Button } from "react-bootstrap";
import { FaTimes } from "react-icons/fa"; // Importing a close icon from react-icons

const MTCGameModal = ({ show, onClose }) => {
  const modalBodyStyle = {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100%", // Ensure the modal body takes full height
  };

  const iframeContainerStyle = {
    border: "1px solid #555555",
    borderRadius: "8px",
    overflow: "hidden", // Ensures content does not overflow outside the rounded corners
    width: "75%", // Adjust width as needed
    height: "75vh", // Adjust height as needed
  };

  const iframeStyle = {
    width: "100%",
    height: "100%",
    border: "none", // Remove default iframe border
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        {/* Custom Close Button */}
        <Button variant="link" onClick={onClose} aria-label="Close">
          <FaTimes size={24} color="#555555" /> {/* Using FaTimes icon */}
        </Button>
      </Modal.Header>
      <Modal.Body style={modalBodyStyle}>
        <div style={iframeContainerStyle}>
          <iframe
            src="https://air.city"
            style={iframeStyle}
            allowFullScreen
            loading="lazy"
          ></iframe>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MTCGameModal;
