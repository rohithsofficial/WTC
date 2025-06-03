import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "./config";

export interface Offer {
  id: string;
  title: string;
  description: string;
  gradientColors: [string, string];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const fetchActiveOffers = async (): Promise<Offer[]> => {
  try {
    console.log("Starting to fetch offers from Firebase...");
    const offersRef = collection(db, "offers");
    const q = query(offersRef, where("isActive", "==", true));
    const querySnapshot = await getDocs(q);

    console.log("Query snapshot size:", querySnapshot.size);

    const offers: Offer[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      // console.log("Document data:", data);

      const offer: Offer = {
        id: doc.id,
        title: data.title,
        description: data.description,
        gradientColors: data.gradientColors as [string, string],
        isActive: data.isActive,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      };

      console.log("Processed offer:", offer);
      offers.push(offer);
    });

    console.log("Total offers fetched:", offers.length);
    return offers;
  } catch (error) {
    console.error("Error fetching offers:", error);
    throw error;
  }
};
