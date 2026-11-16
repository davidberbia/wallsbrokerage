// E-mail d'invitation des agents commerciaux (texte validé par David).
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function agentInviteEmail(firstName: string, link: string) {
  const subject = "Votre compte Wallsbroker : signez votre contrat d'agent commercial";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:600px">
<p>Bonjour ${esc(firstName)},</p>
<p>Votre compte Wallsbroker est prêt. Connectez-vous pour <b>signer en ligne votre contrat d'agent commercial immobilier</b>, comme l'exige la réglementation. À votre première connexion, complétez les informations manquantes, puis générez votre contrat.</p>
<p><b>Important :</b> désormais, les numéros de mandat se demandent dans le CRM. Créez un nouvel actif : le mandat est généré automatiquement et envoyé en signature électronique aux parties concernées.</p>
<p>Votre CRM travaille pour vous :</p>
<ul>
<li>créez et gérez vos biens en quelques clics ;</li>
<li>générez automatiquement un teaser professionnel ;</li>
<li>envoyez-le à vos clients avec accusé de réception et de lecture : votre antériorité est prouvée ;</li>
<li>faites signer vos mandats par DocuSign automatiquement ;</li>
<li>accédez aux comparables de toute l'entreprise ;</li>
<li>suivez votre chiffre d'affaires en temps réel ;</li>
<li>soyez aidé dans vos relances de prospects.</li>
</ul>
<p><a href="${esc(link)}" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none">Me connecter à mon compte</a></p>
<p>À très vite,<br>David Berbia<br>Wallsbroker</p>
</div>`;
  return { subject, html };
}
