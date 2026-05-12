package com.nicolas.chatapp;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class TestDB {
    public static void main(String[] args) {
        try {
            Connection conn = DriverManager.getConnection(
                "jdbc:mysql://chat-apprealtime-nganvuonglebao-db8a.d.aivencloud.com:26368/defaultdb?sslMode=REQUIRED",
                "avnadmin",
                "AVNS_6Nf-0qUCBDXibAJAyxH"
            );
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SHOW TABLES;");
            System.out.println("--- TABLES IN AIVEN DB ---");
            while (rs.next()) {
                System.out.println(rs.getString(1));
            }
            System.out.println("--------------------------");
            rs.close();
            stmt.close();
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
