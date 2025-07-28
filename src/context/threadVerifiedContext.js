'use client';

import React, { createContext, useContext, useState } from "react";

const ThreadVerificationContext = createContext(null);

export const useThreadVerification = () => useContext(ThreadVerificationContext);

export const ThreadVerificationProvider = ({ children }) => {
  const [verifiedMap, setVerifiedMap] = useState({});

  const setVerified = (threadId, status) => {
    setVerifiedMap(prev => ({ ...prev, [threadId]: status }));
  };

  return (
    <ThreadVerificationContext.Provider value={{ verifiedMap, setVerified }}>
      {children}
    </ThreadVerificationContext.Provider>
  );
};
