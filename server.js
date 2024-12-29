import express from "express";
import bodyParser from "body-parser";
import { Client } from "@microsoft/microsoft-graph-client";
import "isomorphic-fetch";

const app = express();
app.use(bodyParser.json());

app.post("/send-email", async (req, res) => {
  const { accessToken, emailData } = req.body;

  if (!accessToken) {
    return res.status(400).send("Access token is required");
  }

  try {
    const client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });

    await client.api("/me/sendMail").post(emailData);

    res.status(200).send("Correo enviado con éxito");
  } catch (error) {
    console.error("Error al enviar el correo:", error);
    res.status(500).send("Error al enviar el correo");
  }
});

app.listen(3000, () => {
  console.log("Servidor ejecutándose en http://localhost:3000");
});