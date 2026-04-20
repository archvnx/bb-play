import React, { useEffect, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchClubs, Club } from '../../services/clubsService';

export default function ClubsScreen({ navigation }: any) {
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadClubs() {
      try {
        const data = await fetchClubs();
        setClubs(data); // only the extracted array
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadClubs();
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>Loading clubs...</Text>
      ) : (
        <FlatList
          data={clubs}
          keyExtractor={(item) => item.icafe_id.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() =>
                navigation.navigate("BookingScreen", { club: item })
              }
            >
              <Text style={styles.address}>{item.address}</Text>
              <Text style={styles.id}>ID: {item.icafe_id}</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  card: {
    padding: 12,
    marginBottom: 10,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  address: { fontSize: 16, fontWeight: "bold" },
  id: { fontSize: 12, color: "#888" },
});
