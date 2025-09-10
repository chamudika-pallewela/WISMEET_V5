import { GoogleGenAI } from '@google/genai';
import { error } from 'console';
import { NextResponse } from 'next/server';
import systemPrompt from '@/lib/SystemPrompt';

export async function POST (request: Request) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({error: "AI KEY NOT FOUND!"}, {status: 500});
        } 

        const AI = new GoogleGenAI({apiKey : apiKey });

        //const body = await request.json();
        //const transcript = body?.prompt;

        const { prompt : transcript = ""} = await request.json();

        const fullPrompt = systemPrompt + transcript + "\n---";
        

        const response = await AI.models.generateContent({
            model : "gemini-2.0-flash",
            contents : fullPrompt,
        });

        const rawText = response.text?.trim() || "";
        console.log("RAW GEMINI RESPONSE", rawText);

        let result = {
            asked_if_speaking_to_customer: false,
            asked_if_customer_name: false,
            asked_if_call_time_okay: false,
            asked_purchase_or_remortgage: false,
            asked_first_time_buyer_or_home_mover: false,
            asked_if_found_property: false,
            asked_property_price_range: false,
            asked_deposit_amount: false,
            asked_outstanding_mortgage_balance: false,
            asked_estimated_property_value: false,
            asked_current_lender: false,
            asked_if_on_fixed_deal_and_end_date: false,
            asked_estimated_rental_income: false,
            asked_if_property_on_standard_AST: false,
            asked_how_many_other_properties: false,
            asked_if_properties_are_let: false,
            asked_if_customer_married: false,
            asked_if_joint_mortgage: false,
            asked_customer_age_or_partner_age: false,
            asked_if_has_children_and_expenses: false,
            asked_customer_nationality: false,
            asked_about_visa_duration_or_residency: false
        };

        try {
            const parsed = JSON.parse(rawText);
            result = {
                asked_if_speaking_to_customer: Boolean(parsed.asked_if_speaking_to_customer),
                asked_if_customer_name: Boolean(parsed.asked_if_customer_name),
                asked_if_call_time_okay: Boolean(parsed.asked_if_call_time_okay),
                asked_purchase_or_remortgage: Boolean(parsed.asked_purchase_or_remortgage),
                asked_first_time_buyer_or_home_mover: Boolean(parsed.asked_first_time_buyer_or_home_mover),
                asked_if_found_property: Boolean(parsed.asked_if_found_property),
                asked_property_price_range: Boolean(parsed.asked_property_price_range),
                asked_deposit_amount: Boolean(parsed.asked_deposit_amount),
                asked_outstanding_mortgage_balance: Boolean(parsed.asked_outstanding_mortgage_balance),
                asked_estimated_property_value: Boolean(parsed.asked_estimated_property_value),
                asked_current_lender: Boolean(parsed.asked_current_lender),
                asked_if_on_fixed_deal_and_end_date: Boolean(parsed.asked_if_on_fixed_deal_and_end_date),
                asked_estimated_rental_income: Boolean(parsed.asked_estimated_rental_income),
                asked_if_property_on_standard_AST: Boolean(parsed.asked_if_property_on_standard_AST),
                asked_how_many_other_properties: Boolean(parsed.asked_how_many_other_properties),
                asked_if_properties_are_let: Boolean(parsed.asked_if_properties_are_let),
                asked_if_customer_married: Boolean(parsed.asked_if_customer_married),
                asked_if_joint_mortgage: Boolean(parsed.asked_if_joint_mortgage),
                asked_customer_age_or_partner_age: Boolean(parsed.asked_customer_age_or_partner_age),
                asked_if_has_children_and_expenses: Boolean(parsed.asked_if_has_children_and_expenses),
                asked_customer_nationality: Boolean(parsed.asked_customer_nationality),
                asked_about_visa_duration_or_residency: Boolean(parsed.asked_about_visa_duration_or_residency)
            };
        } catch (error : any) {
            console.error("JSON PARSING ERROR FALLING BACK TO STRING CHECKING!");

            const normalized = rawText.toLowerCase().replace(/\s/g, "");
            const fields = [
                'asked_if_speaking_to_customer', 'asked_if_customer_name', 'asked_if_call_time_okay',
                'asked_purchase_or_remortgage', 'asked_first_time_buyer_or_home_mover', 'asked_if_found_property',
                'asked_property_price_range', 'asked_deposit_amount', 'asked_outstanding_mortgage_balance',
                'asked_estimated_property_value', 'asked_current_lender', 'asked_if_on_fixed_deal_and_end_date',
                'asked_estimated_rental_income', 'asked_if_property_on_standard_AST', 'asked_how_many_other_properties',
                'asked_if_properties_are_let', 'asked_if_customer_married', 'asked_if_joint_mortgage',
                'asked_customer_age_or_partner_age', 'asked_if_has_children_and_expenses', 'asked_customer_nationality',
                'asked_about_visa_duration_or_residency'
            ];

            fields.forEach(field => {
                if (normalized.includes(`"${field}":true`) || normalized.includes(`${field}:true`)) {
                    result[field as keyof typeof result] = true;
                }
            });
        }

        console.log("RESULT", result);
        
        return NextResponse.json({
           result
        });
    } catch (error: any) {
        console.error("ERROR IN GEMINI API", error);
        return NextResponse.json(
          { error: error.message || "SOMETHING WENT WRONG!" },
          { status: 500 }
        );
    }
}