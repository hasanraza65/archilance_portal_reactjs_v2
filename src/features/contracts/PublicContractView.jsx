import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ContractDocument from "./ContractDocument";
import SlideToAccept from "./SlideToAccept";
import { fetchPublicContract, acceptPublicContract } from "@/api/contracts";
import { extractErrorMessage } from "@/api/client";
import { formatDateTime } from "@/lib/format";

const PublicContractView = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [contract, setContract] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchPublicContract(token);
        if (!active) return;
        setContract(res.data);
        if (String(res.data?.status).toLowerCase() === "accepted") setAccepted(true);
      } catch (err) {
        if (active) setError(extractErrorMessage(err, "This contract link is invalid or has expired."));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await acceptPublicContract(token);
      setAccepted(true);
    } catch (err) {
      setError(extractErrorMessage(err, "We couldn't record your acceptance. Please try again."));
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-slate-400">Loading your contract…</div>
      </div>
    );
  }

  if (error && !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-6">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-red-100 flex items-center justify-center mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <h1 className="text-lg font-semibold text-slate-800 mb-1">Link unavailable</h1>
          <p className="text-sm text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold" style={{ background: "#6d5ef8" }}>A</span>
            <div className="leading-tight">
              <div className="font-bold text-slate-800">Archilance LLC</div>
              <div className="text-[11px] text-slate-400">Employment Contract</div>
            </div>
          </div>
          {(accepted || String(contract?.status).toLowerCase() === "accepted") && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full">
              <span>✓</span> Accepted
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 px-6 sm:px-12 py-10 sm:py-14">
            <ContractDocument html={contract?.body} />
          </div>
          <p className="text-center text-[11px] text-slate-400 mt-4">
            This is a secure contract link prepared for {contract?.recipient_name || "you"} · Archilance LLC
          </p>
          <div className="h-28" />
        </div>
      </main>

      <footer className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t border-slate-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {accepted ? (
            <div className="text-center py-2">
              <div className="inline-flex items-center gap-2 text-emerald-600 font-semibold">
                <span className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">✓</span>
                Thank you — your contract has been accepted.
              </div>
              <p className="text-sm text-slate-500 mt-1">
                {contract?.accepted_at ? `Accepted on ${formatDateTime(contract.accepted_at)}. ` : ""}
                Please check your email for your login details.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-center text-xs text-slate-500 mb-3">
                By sliding below, you confirm that you have read and agree to the terms of this employment agreement.
              </p>
              <div className="max-w-md mx-auto">
                <SlideToAccept onAccept={handleAccept} disabled={accepting} />
              </div>
              {error && <p className="text-center text-xs text-red-500 mt-2">{error}</p>}
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default PublicContractView;
