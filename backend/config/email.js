import nodemailer from "nodemailer";

const mailTransporter = nodemailer.createTransport({
  host: "smtp.hostinger.com",
  port: 465,
  secure: true,
  auth: {
    user: "noreply@manage-rtc.com",
    pass: "7g[+r@RF2P",
  },
});

export default mailTransporter;
