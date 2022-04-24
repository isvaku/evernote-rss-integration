import nodemailer, { SentMessageInfo } from "nodemailer";
import handlebars from "handlebars";
import fs from "fs";
import path from "path";
import config from "../../Config/config";

const sendEmail = (
    email: string,
    subject: string,
    payload: any,
    template: string
) => {
    const transporter = nodemailer.createTransport(config.nodemailer);

    const source = fs.readFileSync(path.join(__dirname, template), "utf8");
    const compiledTemplate = handlebars.compile(source);
    const options = () => {
        return {
            from: config.nodemailer.auth.user,
            to: email,
            subject: subject,
            html: compiledTemplate(payload)
        };
    };

    transporter.sendMail(options(), (error: Error, info: SentMessageInfo) => {
        if (error) {
            console.log('error :>> ', error);
        } else {
            console.log('info :>> ', info.response);
        }
    });
};

export default sendEmail;
