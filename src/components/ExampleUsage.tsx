import React from 'react';
import LienWaiverDocument from './LienWaiverDocument';

const MockDataExample = () => {
  const mockProps = {
    vendor: {
      name: "Boulder Construction Services LLC",
      address: "123 Industrial Way, Suite 400, Newark, NJ 07102"
    },
    project: {
      name: "Caldwell & Sons Realty - Block 4 Renovations",
      owner: "Caldwell Properties LLC",
      address: "321 Broad St, Red Bank, NJ 07701"
    },
    invoices: [
      { id: "INV-001", amount: 12500.00 },
      { id: "INV-002", amount: 8750.50 }
    ],
    mode: "invoice" as const,
    type: "partial" as const,
    condition: "conditional" as const,
    date: "April 22, 2026",
    signer: {
      name: "John Doe",
      title: "VP of Operations"
      // signature: "data:image/png;base64,..." // Optional base64 signature
    }
  };

  return (
    <div className="bg-slate-200 min-h-screen py-12">
      <LienWaiverDocument {...mockProps} />
    </div>
  );
};

export default MockDataExample;
