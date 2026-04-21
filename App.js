import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = 'http://192.168.1.3:4456';
const AUTH_USER_KEY = 'auth_user';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isCasesLoading, setIsCasesLoading] = useState(false);
  const [isTreatmentsLoading, setIsTreatmentsLoading] = useState(false);
  const [isDiaryLoading, setIsDiaryLoading] = useState(false);
  const [isDiarySubmitting, setIsDiarySubmitting] = useState(false);

  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [authUser, setAuthUser] = useState(null);

  const [screen, setScreen] = useState('cases');
  const [medicalCases, setMedicalCases] = useState([]);
  const [selectedCase, setSelectedCase] = useState(null);
  const [treatments, setTreatments] = useState([]);
  const [selectedTreatment, setSelectedTreatment] = useState(null);
  const [diaryEntries, setDiaryEntries] = useState([]);

  const [form, setForm] = useState({
    bodyTemperature: '',
    systolicPressure: '',
    diastolicPressure: '',
    pulse: '',
    wellBeingLevel: '',
    painLevel: '',
    complaintText: '',
    commentText: '',
  });

  useEffect(() => {
    restoreSession();
  }, []);

  const restoreSession = async () => {
    try {
      const userJson = await AsyncStorage.getItem(AUTH_USER_KEY);

      if (userJson) {
        const user = JSON.parse(userJson);
        setAuthUser(user);
        setIsAuthenticated(true);
        await loadMedicalCases(user.patientId);
      }
    } catch (error) {
      console.log('restoreSession error', error);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!login.trim() || !password.trim()) {
      Alert.alert('Ошибка', 'Введите логин и пароль');
      return;
    }

    try {
      setIsLoginLoading(true);

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          login: login.trim(),
          password,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Не удалось выполнить вход';

        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch (parseError) {
          console.log('login parse error', parseError);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(data));

      setAuthUser(data);
      setIsAuthenticated(true);
      setScreen('cases');
      await loadMedicalCases(data.patientId);
    } catch (error) {
      Alert.alert('Ошибка входа', error.message || 'Не удалось выполнить вход');
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem(AUTH_USER_KEY);
    } catch (error) {
      console.log('logout error', error);
    }

    setAuthUser(null);
    setIsAuthenticated(false);
    setLogin('');
    setPassword('');
    setMedicalCases([]);
    setSelectedCase(null);
    setTreatments([]);
    setSelectedTreatment(null);
    setDiaryEntries([]);
    setScreen('cases');
  };

  const loadMedicalCases = async (patientId) => {
    if (!patientId) {
      Alert.alert('Ошибка', 'Не найден идентификатор пациента');
      return;
    }

    try {
      setIsCasesLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/api/patient/medical-cases?patientId=${patientId}`
      );

      if (!response.ok) {
        let errorMessage = 'Не удалось загрузить случаи обращения';

        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch (parseError) {
          console.log('medical-cases parse error', parseError);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setMedicalCases(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось загрузить случаи обращения'
      );
    } finally {
      setIsCasesLoading(false);
    }
  };

  const loadTreatments = async (caseItem) => {
    if (!caseItem?.id) {
      Alert.alert('Ошибка', 'Не найден идентификатор случая обращения');
      return;
    }

    try {
      setIsTreatmentsLoading(true);
      setSelectedCase(caseItem);
      setSelectedTreatment(null);
      setTreatments([]);
      setDiaryEntries([]);
      setScreen('treatments');

      const response = await fetch(
        `${API_BASE_URL}/api/patient/medical-cases/${caseItem.id}/treatments`
      );

      if (!response.ok) {
        let errorMessage = 'Не удалось загрузить лечение';

        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch (parseError) {
          console.log('treatments parse error', parseError);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setTreatments(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить лечение');
      setTreatments([]);
    } finally {
      setIsTreatmentsLoading(false);
    }
  };

  const loadDiaryEntries = async (treatment) => {
    if (!selectedCase?.id || !treatment?.id || !authUser?.patientId) {
      Alert.alert('Ошибка', 'Недостаточно данных для загрузки дневника');
      return;
    }

    try {
      setIsDiaryLoading(true);
      setSelectedTreatment(treatment);
      setDiaryEntries([]);
      setScreen('diaryHistory');

      const response = await fetch(
        `${API_BASE_URL}/api/patient/medical-cases/${selectedCase.id}/treatments/${treatment.id}/diary?patientId=${authUser.patientId}`
      );

      if (!response.ok) {
        let errorMessage = 'Не удалось загрузить записи дневника';

        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch (parseError) {
          console.log('diary history parse error', parseError);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      setDiaryEntries(Array.isArray(data) ? data : []);
    } catch (error) {
      Alert.alert('Ошибка', error.message || 'Не удалось загрузить записи дневника');
      setDiaryEntries([]);
    } finally {
      setIsDiaryLoading(false);
    }
  };

  const openDiaryForm = (treatment) => {
    setSelectedTreatment(treatment);
    setForm({
      bodyTemperature: '',
      systolicPressure: '',
      diastolicPressure: '',
      pulse: '',
      wellBeingLevel: '',
      painLevel: '',
      complaintText: '',
      commentText: '',
    });
    setScreen('diaryForm');
  };

  const submitDiaryEntry = async () => {
    if (!authUser?.patientId) {
      Alert.alert('Ошибка', 'Не найден идентификатор пациента');
      return;
    }

    if (!selectedCase?.id || !selectedTreatment?.id) {
      Alert.alert('Ошибка', 'Не выбран случай обращения или лечение');
      return;
    }

    if (
      !form.bodyTemperature ||
      !form.systolicPressure ||
      !form.diastolicPressure ||
      !form.pulse ||
      !form.wellBeingLevel ||
      !form.painLevel
    ) {
      Alert.alert('Ошибка', 'Заполните обязательные поля');
      return;
    }

    try {
      setIsDiarySubmitting(true);

      const response = await fetch(
        `${API_BASE_URL}/api/patient/medical-cases/${selectedCase.id}/treatments/${selectedTreatment.id}/diary?patientId=${authUser.patientId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bodyTemperature: Number(form.bodyTemperature),
            systolicPressure: Number(form.systolicPressure),
            diastolicPressure: Number(form.diastolicPressure),
            pulse: Number(form.pulse),
            wellBeingLevel: Number(form.wellBeingLevel),
            painLevel: Number(form.painLevel),
            complaintText: form.complaintText,
            commentText: form.commentText,
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Не удалось отправить запись дневника';

        try {
          const errorData = await response.json();
          if (errorData?.message) errorMessage = errorData.message;
        } catch (parseError) {
          console.log('diary submit parse error', parseError);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();

      Alert.alert(
        'Успешно',
        data?.message || 'Запись дневника успешно отправлена врачу'
      );

      await loadDiaryEntries(selectedTreatment);
    } catch (error) {
      Alert.alert(
        'Ошибка',
        error.message || 'Не удалось отправить запись дневника'
      );
    } finally {
      setIsDiarySubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    if (typeof dateString !== 'string') return String(dateString);

    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}.${month}.${year}`;
    }

    return dateString;
  };

  if (isAuthLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centeredBlock}>
          <Text style={styles.title}>Дневник симптомов</Text>
          <Text style={styles.subtitle}>Проверка сохранённого входа...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.loginScrollContent}>
          <View style={styles.loginWrapper}>
            <Text style={styles.title}>Дневник симптомов</Text>
            <Text style={styles.subtitle}>Вход в аккаунт пациента</Text>

            <TextInput
              style={styles.input}
              placeholder="Логин"
              autoCapitalize="none"
              value={login}
              onChangeText={setLogin}
            />

            <TextInput
              style={styles.input}
              placeholder="Пароль"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity
              style={[styles.primaryButton, isLoginLoading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={isLoginLoading}
            >
              <Text style={styles.primaryButtonText}>
                {isLoginLoading ? 'Выполняется вход...' : 'Войти'}
              </Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Backend: {API_BASE_URL}</Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'cases') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.topBlock}>
            <Text style={styles.title}>Здравствуйте!</Text>
            <Text style={styles.subtitle}>{authUser?.fullName || 'Пациент'}</Text>
          </View>

          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => loadMedicalCases(authUser?.patientId)}
              disabled={isCasesLoading}
            >
              <Text style={styles.secondaryButtonText}>
                {isCasesLoading ? 'Загрузка...' : 'Обновить случаи'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
              <Text style={styles.secondaryButtonText}>Выйти</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Мои случаи обращения</Text>

          {isCasesLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Загрузка случаев обращения...</Text>
            </View>
          ) : medicalCases.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Случаи обращения не найдены</Text>
            </View>
          ) : (
            medicalCases.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() => loadTreatments(item)}
              >
                <Text style={styles.cardTitle}>{item.caseNumber}</Text>
                <Text style={styles.cardText}>Диагноз: {item.diagnosis || '-'}</Text>
                <Text style={styles.cardText}>
                  Дата начала: {formatDate(item.startDate)}
                </Text>
                <Text style={styles.cardText}>
                  Дата окончания: {formatDate(item.endDate)}
                </Text>
                <Text style={styles.cardText}>Статус: {item.status || '-'}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'treatments') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.topBlock}>
            <TouchableOpacity onPress={() => setScreen('cases')}>
              <Text style={styles.backLink}>← Назад к случаям</Text>
            </TouchableOpacity>

            <Text style={styles.title}>
              {selectedCase?.caseNumber || 'Случай обращения'}
            </Text>
            <Text style={styles.subtitle}>
              Диагноз: {selectedCase?.diagnosis || '-'}
            </Text>
          </View>

          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => loadTreatments(selectedCase)}
              disabled={isTreatmentsLoading}
            >
              <Text style={styles.secondaryButtonText}>
                {isTreatmentsLoading ? 'Загрузка...' : 'Обновить лечение'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Лечение</Text>

          {isTreatmentsLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Загрузка лечения...</Text>
            </View>
          ) : treatments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Лечение не найдено</Text>
            </View>
          ) : (
            treatments.map((item) => (
              <View key={item.id} style={styles.card}>
                <Text style={styles.cardTitle}>
                  {item.treatmentName || 'Без названия'}
                </Text>
                <Text style={styles.cardText}>Описание: {item.description || '-'}</Text>
                <Text style={styles.cardText}>
                  Дата начала: {formatDate(item.startDate)}
                </Text>
                <Text style={styles.cardText}>
                  Дата окончания: {formatDate(item.endDate)}
                </Text>
                <Text style={styles.cardText}>
                  Активность: {item.isActive ? 'Активно' : 'Неактивно'}
                </Text>
                <Text style={styles.cardText}>ID врача: {item.doctorId ?? '-'}</Text>

                <TouchableOpacity
                  style={styles.secondaryActionButton}
                  onPress={() => loadDiaryEntries(item)}
                >
                  <Text style={styles.secondaryActionButtonText}>
                    Просмотреть все записи
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.primaryButtonSmall}
                  onPress={() => openDiaryForm(item)}
                >
                  <Text style={styles.primaryButtonText}>Заполнить дневник</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'diaryHistory') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.topBlock}>
            <TouchableOpacity onPress={() => setScreen('treatments')}>
              <Text style={styles.backLink}>← Назад к лечению</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Все записи дневника</Text>
            <Text style={styles.subtitle}>
              Лечение: {selectedTreatment?.treatmentName || '-'}
            </Text>
          </View>

          <View style={styles.actionsColumn}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => loadDiaryEntries(selectedTreatment)}
              disabled={isDiaryLoading}
            >
              <Text style={styles.secondaryButtonText}>
                {isDiaryLoading ? 'Загрузка...' : 'Обновить записи'}
              </Text>
            </TouchableOpacity>
          </View>

          {isDiaryLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Загрузка записей дневника...</Text>
            </View>
          ) : diaryEntries.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                Записи дневника по этому лечению отсутствуют
              </Text>
            </View>
          ) : (
            diaryEntries.map((entry) => (
              <View key={entry.id} style={styles.card}>
                <Text style={styles.cardTitle}>Запись №{entry.id}</Text>
                <Text style={styles.cardText}>
                  Температура: {entry.bodyTemperature ?? '-'}
                </Text>
                <Text style={styles.cardText}>
                  Систолическое давление: {entry.systolicPressure ?? '-'}
                </Text>
                <Text style={styles.cardText}>
                  Диастолическое давление: {entry.diastolicPressure ?? '-'}
                </Text>
                <Text style={styles.cardText}>Пульс: {entry.pulse ?? '-'}</Text>
                <Text style={styles.cardText}>
                  Самочувствие: {entry.wellBeingLevel ?? '-'}
                </Text>
                <Text style={styles.cardText}>Боль: {entry.painLevel ?? '-'}</Text>
                <Text style={styles.cardText}>
                  Жалобы: {entry.complaintText || '-'}
                </Text>
                <Text style={styles.cardText}>
                  Комментарий: {entry.commentText || '-'}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (screen === 'diaryForm') {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.pageContent}>
          <View style={styles.topBlock}>
            <TouchableOpacity onPress={() => setScreen('treatments')}>
              <Text style={styles.backLink}>← Назад к лечению</Text>
            </TouchableOpacity>

            <Text style={styles.title}>Запись дневника</Text>
            <Text style={styles.subtitle}>
              Лечение: {selectedTreatment?.treatmentName || '-'}
            </Text>
          </View>

          <FormInput
            label="Температура тела"
            placeholder="37.5"
            value={form.bodyTemperature}
            onChangeText={(value) => setForm({ ...form, bodyTemperature: value })}
            keyboardType="numeric"
          />

          <FormInput
            label="Систолическое давление"
            placeholder="120"
            value={form.systolicPressure}
            onChangeText={(value) => setForm({ ...form, systolicPressure: value })}
            keyboardType="numeric"
          />

          <FormInput
            label="Диастолическое давление"
            placeholder="80"
            value={form.diastolicPressure}
            onChangeText={(value) => setForm({ ...form, diastolicPressure: value })}
            keyboardType="numeric"
          />

          <FormInput
            label="Пульс"
            placeholder="82"
            value={form.pulse}
            onChangeText={(value) => setForm({ ...form, pulse: value })}
            keyboardType="numeric"
          />

          <FormInput
            label="Самочувствие (1-5)"
            placeholder="3"
            value={form.wellBeingLevel}
            onChangeText={(value) => setForm({ ...form, wellBeingLevel: value })}
            keyboardType="numeric"
          />

          <FormInput
            label="Уровень боли (0-10)"
            placeholder="2"
            value={form.painLevel}
            onChangeText={(value) => setForm({ ...form, painLevel: value })}
            keyboardType="numeric"
          />

          <FormInput
            label="Жалобы"
            placeholder="Опишите жалобы"
            value={form.complaintText}
            onChangeText={(value) => setForm({ ...form, complaintText: value })}
            multiline
          />

          <FormInput
            label="Комментарий"
            placeholder="Дополнительная информация"
            value={form.commentText}
            onChangeText={(value) => setForm({ ...form, commentText: value })}
            multiline
          />

          <TouchableOpacity
            style={[styles.primaryButton, isDiarySubmitting && styles.buttonDisabled]}
            onPress={submitDiaryEntry}
            disabled={isDiarySubmitting}
          >
            <Text style={styles.primaryButtonText}>
              {isDiarySubmitting ? 'Отправка...' : 'Отправить врачу'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

function FormInput({ label, multiline = false, ...props }) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.multilineInput]}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fb',
  },
  centeredBlock: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loginScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 48,
  },
  loginWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 48,
  },
  pageContent: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 72,
  },
  topBlock: {
    marginBottom: 26,
  },
  actionsColumn: {
    marginBottom: 24,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b7280',
    marginTop: 6,
    lineHeight: 21,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
    lineHeight: 20,
  },
  inputWrapper: {
    marginBottom: 14,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: '#111827',
    marginTop: 4,
  },
  multilineInput: {
    minHeight: 96,
    paddingTop: 12,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
  },
  primaryButtonSmall: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 14,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryActionButton: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  secondaryActionButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 15,
  },
  backLink: {
    fontSize: 15,
    color: '#2563eb',
    marginBottom: 14,
    fontWeight: '600',
  },
  emptyState: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    color: '#6b7280',
    fontSize: 15,
    textAlign: 'center',
  },
  infoBox: {
    marginTop: 20,
    backgroundColor: '#e0ecff',
    borderRadius: 12,
    padding: 14,
  },
  infoText: {
    color: '#1e3a8a',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
