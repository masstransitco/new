// src/components/Map/DepartTime.jsx

import React, { useState, useEffect } from "react";
import styled from "@emotion/styled";
import Modal from "@mui/material/Modal";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import PropTypes from "prop-types"; // Ensure PropTypes is imported

const ModalContainer = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: white;
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 400px;
  width: 90%;
`;

const PriceSection = styled.div`
  padding: 24px;
  background-color: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 24px;
`;

const PriceTitle = styled.h2`
  font-size: 24px;
  margin-bottom: 16px;
  color: #1b6cfb;
`;

const PriceOption = styled.div`
  margin-bottom: 16px;
`;

const StyledButton = styled.button`
  width: 90%;
  padding: 16px;
  margin: 8px auto;
  border-radius: 50px;
  border: none;
  background-color: #1b6cfb;
  color: white;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    background-color: #a0c4ff;
    cursor: not-allowed;
  }
`;

const StyledSelect = styled(Select)`
  width: 90%;
  margin: 16px auto;
  .MuiSelect-select {
    padding: 12px;
  }
`;

const DepartTime = ({ open, onClose, onConfirm }) => {
  const [departureOptions, setDepartureOptions] = useState([]);
  const [selectedTime, setSelectedTime] = useState("");

  useEffect(() => {
    if (!open) return;

    const generateTimeOptions = () => {
      const now = new Date();
      const options = [];

      // Option 1: 45-60 mins
      const option1 = new Date(
        now.getTime() + (45 + Math.random() * 15) * 60000
      );

      // Option 2: 1h30-1h45
      const option2 = new Date(
        now.getTime() + (90 + Math.random() * 15) * 60000
      );

      // Option 3: 2h30-2h45
      const option3 = new Date(
        now.getTime() + (150 + Math.random() * 15) * 60000
      );

      // Removed unused 'options' variable
      // return options.map(...);

      // Directly return the mapped options
      return [option1, option2, option3].map((time) => ({
        value: time.getTime(),
        label: time.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));
    };

    setDepartureOptions(generateTimeOptions());
  }, [open]);

  const handleConfirm = () => {
    if (selectedTime) {
      onConfirm(selectedTime); // Pass the selected time back to MapContainer
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      aria-labelledby="departure-time-modal"
      aria-describedby="select-departure-time"
    >
      <ModalContainer>
        <PriceSection>
          <PriceTitle>Fare Options</PriceTitle>
          <PriceOption>
            <h3>Pay-as-You-Go</h3>
            <p>HKD$1 per minute</p>
            <p>HKD$600 max per day (24 hours from pick-up)</p>
          </PriceOption>
          <PriceOption>
            <h3>Station-to-Station</h3>
            <p>*Choose a destination to view fare</p>
          </PriceOption>
        </PriceSection>

        <StyledSelect
          value={selectedTime}
          onChange={(e) => setSelectedTime(e.target.value)}
          displayEmpty
          renderValue={selectedTime ? undefined : () => "Select departure time"}
        >
          {departureOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </StyledSelect>

        <StyledButton onClick={handleConfirm} disabled={!selectedTime}>
          Confirm your booking
        </StyledButton>
      </ModalContainer>
    </Modal>
  );
};

DepartTime.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired, // New prop for handling confirmation
};

export default DepartTime;
