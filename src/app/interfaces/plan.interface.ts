import { PlanType } from "../types/plan.type";

export interface IPlan {
    title: string;
    price: number;
    type: PlanType;
    buttonText: string; // Optional property for button text
    features: [string, string, string]; // Tuple with three numeric features
    active?: boolean; // Optional property to indicate if the plan is currently active
}