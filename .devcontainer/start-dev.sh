#!/bin/bash

service mysql start

until mysqladmin ping -h "localhost" --silent; do
    sleep 1
done

echo "MySQL is ready!"

mysql -e "CREATE USER IF NOT EXISTS 'app'@'%' IDENTIFIED BY 'app_pw_change_me';"
mysql -e "CREATE DATABASE IF NOT EXISTS red_tetris;"
mysql -e "GRANT ALL PRIVILEGES ON red_tetris.* TO 'app'@'%';"
mysql -e "CREATE DATABASE IF NOT EXISTS red_tetris_test;"
mysql -e "GRANT ALL PRIVILEGES ON red_tetris_test.* TO 'app'@'%';"

mysql -e "FLUSH PRIVILEGES;"

echo "Done!"
