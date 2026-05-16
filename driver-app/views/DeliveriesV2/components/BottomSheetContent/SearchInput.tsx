import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import { colors } from '@components/theme';

import { styles } from './styles';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  searchInputRef: React.RefObject<TextInput>;
}

export const SearchInput: React.FC<SearchInputProps> = ({ value, onChangeText, searchInputRef }) => (
  <View style={styles.searchContainer}>
    <Ionicons name="search-outline" size={20} color={colors.grey[600]} style={styles.searchIcon} />
    <TextInput
      ref={searchInputRef}
      value={value}
      onChangeText={onChangeText}
      placeholder="Search deliveries..."
      placeholderTextColor={colors.grey[500]}
      style={styles.searchInput}
      autoFocus={false}
    />
    {value.length > 0 && (
      <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
        <Ionicons name="close-circle" size={20} color={colors.grey[600]} />
      </TouchableOpacity>
    )}
  </View>
);
