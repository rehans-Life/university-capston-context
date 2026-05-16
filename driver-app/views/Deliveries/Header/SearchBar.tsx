import React, { useState, useEffect, useCallback } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';

import { debounce } from '@/helpers/Debounce';

interface SearchComponentProps {
  searchOpen: boolean;
  setSearchText: (value: string) => void;
  setSearchOpen: (value: boolean) => void;
}

const SearchComponent = ({ searchOpen, setSearchOpen, setSearchText }: SearchComponentProps) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const handleSearch = useCallback(
    debounce((query: string) => {
      setSearchText(query);
    }, 500),
    []
  );

  useEffect(() => {
    handleSearch(searchQuery);
  }, [searchQuery, handleSearch]);

  const handleCloseSearch = () => {
    setSearchText('');
    setSearchQuery('');
    setSearchOpen(false);
  };

  return (
    <View>
      {searchOpen ? (
        <View style={{ width: '100%', flexDirection: 'row' }}>
          <View style={styles.searchSection}>
            <Icon name="search-outline" size={16} color="#9D9D9D" style={{ marginLeft: 4 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search"
              style={styles.input}
              placeholderTextColor="#9D9D9D"
            />
          </View>
          <View style={{ alignSelf: 'center', marginLeft: 12 }}>
            <TouchableOpacity onPress={handleCloseSearch}>
              <Icon name="close" size={21} color="black" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => setSearchOpen(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            marginLeft: 4,
            marginTop: 2,
            width: 26,
            height: 26
          }}
        >
          <Icon name="search-outline" size={21} color="black" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderRadius: 24,
    paddingHorizontal: 10,
    marginHorizontal: 4,
    width: '80%'
  },
  input: {
    backgroundColor: '#f2f2f2',
    color: '#9D9D9D',
    width: '100%',
    borderRadius: 24,
    padding: 6,
    fontSize: 15,
    fontFamily: 'Lato-Bold',
    lineHeight: 21,
    fontWeight: '800'
  }
});

export default SearchComponent;
