#!/bin/sh
# Découpe les bruitages du jeu dans la vidéo de Rudy (reference/3d/pub-video-rudy.mp4) : vrais sons « 3D »
# (souffle de flamme, gros impact, éclaboussure, rugissement, final). Usage : sh tools/extract_sons.sh
set -e
cd "$(dirname "$0")/.."
V=reference/3d/pub-video-rudy.mp4
O=public/assets/sons
mkdir -p $O
cut() { # nom début durée
  ffmpeg -v error -y -ss "$2" -t "$3" -i "$V" -vn -ac 1 -ar 44100 \
    -af "afade=t=in:d=0.02,afade=t=out:st=$(echo "$3 - 0.08" | bc | sed "s/^\./0./"):d=0.08,loudnorm=I=-14:TP=-1.5" -c:a libmp3lame -b:a 96k "$O/$1.mp3"
}
cut poele 3.28 0.46      # coup de poêle : impact + flamme
cut flamme 3.10 0.85     # attaque des flammes (ultime) : souffle + impact + flamme
cut lourd 5.30 0.42      # frappe lourde (Shiba, Taureau, Ours)
cut ecrase 5.50 0.38     # monstre écrasé (éclaboussure)
cut wok 6.36 0.42        # coup rapide (Noisette, Tigre)
cut boss 7.10 1.10       # le boss arrive : rugissement
cut final 8.90 1.17      # victoire : final épique
cut marmite 0.80 0.80    # marmite qui bout
echo "sons découpés dans $O"
