import React from "react";
import { Link } from "react-router-dom";

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
      <p className="mb-0">{currentYear} © amasQIS.ai</p>
      <p className="mb-0">
        Designed &amp; Developed By{" "}
        <Link to="https://amasqis.ai" className="text-primary">
          amasQIS.ai
        </Link>
      </p>
    </div>
  );
};

export default Footer;
