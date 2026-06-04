import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { getTheme, ColorTheme } from "./utils";

export interface BrandingData {
  id?: string;
  name: string;
  nameEs?: string;
  phone: string;
  email: string;
  address: string;
  addressEs?: string;
  primaryColor: string;
  logoUrl?: string;
  heroImage?: string;
  supportImage?: string;
}

interface BrandingContextType {
  branding: BrandingData | null;
  allBranches: BrandingData[];
  selectedBranchId: string | null;
  changeBranch: (id: string) => void;
  isLoadingBranding: boolean;
  theme: ColorTheme;
  reloadBranding: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType | undefined>(undefined);

const DEFAULT_BRANDING: BrandingData = {
  name: "PHC Pharmacy",
  nameEs: "PHC Pharmacy",
  phone: "(305) 413-5070",
  email: "info@phcpharmacy.com",
  address: "123 Health Ave, Miami, FL 33101",
  addressEs: "123 Health Ave, Miami, FL 33101",
  primaryColor: "emerald",
  heroImage: "https://picsum.photos/seed/pharmacy/1920/1080",
  supportImage: "https://picsum.photos/seed/pharmacist/800/800",
  logoUrl: ""
};

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [allBranches, setAllBranches] = useState<BrandingData[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string | null>(() => {
    return localStorage.getItem("selected_branch_id");
  });
  const [isLoadingBranding, setIsLoadingBranding] = useState(true);

  const fetchBranding = async () => {
    try {
      setIsLoadingBranding(true);
      const bSnap = await getDocs(collection(db, "branding"));
      if (!bSnap.empty) {
        const branches = bSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BrandingData[];
        
        setAllBranches(branches);

        // Find matches based on localStorage or pick the first one
        let active = branches[0];
        const savedId = localStorage.getItem("selected_branch_id");
        if (savedId) {
          const matched = branches.find(b => b.id === savedId);
          if (matched) {
            active = matched;
          }
        }
        setBranding(active);
        setSelectedBranchId(active.id || null);
        if (active.id) {
          localStorage.setItem("selected_branch_id", active.id);
        }
      } else {
        // Fallback if collections are empty
        setBranding(DEFAULT_BRANDING);
        setAllBranches([DEFAULT_BRANDING]);
      }
    } catch (error) {
      console.error("Error fetching branding:", error);
      setBranding(DEFAULT_BRANDING);
      setAllBranches([DEFAULT_BRANDING]);
    } finally {
      setIsLoadingBranding(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  const changeBranch = (id: string) => {
    const matched = allBranches.find(b => b.id === id);
    if (matched) {
      setBranding(matched);
      setSelectedBranchId(id);
      localStorage.setItem("selected_branch_id", id);
      // Trigger update event
      window.dispatchEvent(new Event("branding-updated"));
    }
  };

  const theme = getTheme(branding?.primaryColor || "emerald");

  return (
    <BrandingContext.Provider value={{ 
      branding, 
      allBranches, 
      selectedBranchId, 
      changeBranch, 
      isLoadingBranding, 
      theme,
      reloadBranding: fetchBranding 
    }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const context = useContext(BrandingContext);
  if (context === undefined) {
    throw new Error("useBranding must be used within a BrandingProvider");
  }
  return context;
}
