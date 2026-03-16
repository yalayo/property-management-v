import React from "react";
import "../lib/i18n"; // initialise i18next before any child renders

export default function Main({ activeComponent }) {
    return (<div>{activeComponent}</div>);
}