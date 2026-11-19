// E-mail d'invitation des agents commerciaux (texte validé par David).
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
export function agentInviteEmail(firstName: string, link: string, signed = false) {
  const subject = signed ? "Votre contrat est signé : voici vos accès au CRM Wallsbroker" : "Vos accès au CRM Wallsbroker";
  const html = `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;max-width:600px">
<p>Bonjour ${esc(firstName)},</p>
<p>${signed ? "Votre contrat d'agent commercial est signé, vous en trouverez une copie jointe. " : ""}Votre compte sur le CRM Wallsbroker est prêt. Cliquez sur le bouton ci-dessous pour choisir votre mot de passe.</p>
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
<p><a href="${esc(link)}" style="display:inline-block;background:#1a1a1a;color:#ffffff;padding:12px 20px;border-radius:4px;text-decoration:none">Activer mon compte</a></p>
<p>À très vite,<br>David Berbia<br>Wallsbroker</p>
</div>`;
  return { subject, html };
}
