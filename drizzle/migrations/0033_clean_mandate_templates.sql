update public.mandate_templates set body =
regexp_replace(
 regexp_replace(
  regexp_replace(
   regexp_replace(body, E'\\n-{3}\\s*\\n+##\\s*FORMULAIRE DE RÉTRACTATION[\\s\\S]*$', E'\n', 'i'),
  E'\\n##\\s*FORMULAIRE DE RÉTRACTATION[\\s\\S]*$', E'\n', 'i'),
 ' Il peut utiliser le formulaire ci-dessous ou toute autre déclaration dénuée d''ambiguïté\.', ' Il peut l''exercer par toute déclaration dénuée d''ambiguïté.', 'g'),
E'(^|\\n)La société WALLSBROKER([^*]|$)', E'\\1**La société WALLSBROKER**\\2', 'g');