# Utiliser une image Nginx légère
FROM nginx:alpine

# Copier les fichiers du projet dans le dossier public de Nginx
COPY . /usr/share/nginx/html

# Exposer le port 80 (interne au conteneur)
EXPOSE 80
