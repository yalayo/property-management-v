import React from "react";
import "../lib/i18n"; // initialise i18next before any child renders
import { Toaster } from "../components/ui/toaster";

export default function Main({ activeComponent }) {
    return (
        <div>
            {activeComponent}
            <Toaster />
        </div>
    );
}