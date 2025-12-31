import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import api from '../services/api';
import Toast from '../components/Toast';
import { COLORS } from '../utils/constants';

const SubscriptionScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [subscriptionData, plansData] = await Promise.all([
        api.getSubscriptionStatus(),
        api.getSubscriptionPlans(),
      ]);
      setSubscription(subscriptionData.subscription);
      setPlans(plansData.plans);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      Toast.fail('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = (plan) => {
    setSelectedPlan(plan);
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = async () => {
    if (!selectedPlan) return;

    setPurchasing(true);
    try {
      const result = await api.purchaseSubscription(selectedPlan.id, 'google_pay');
      setSubscription(result.subscription);
      setShowPaymentModal(false);
      setSelectedPlan(null);
      Toast.success('Subscription activated successfully!');
    } catch (error) {
      Toast.fail(error.message || 'Purchase failed');
    } finally {
      setPurchasing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getPlanName = (planId) => {
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || planId;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.contentContainer, { paddingBottom: 100 + insets.bottom }]}
    >
      {/* Current Subscription Card */}
      {subscription?.active ? (
        <View style={styles.currentSubscriptionCard}>
          <View style={styles.currentSubscriptionHeader}>
            <MaterialCommunityIcons name="check-circle" size={24} color={COLORS.success} />
            <Text style={styles.currentSubscriptionTitle}>Active Subscription</Text>
          </View>
          <Text style={styles.currentPlanName}>{getPlanName(subscription.plan)}</Text>
          <View style={styles.currentSubscriptionInfo}>
            <View style={styles.currentSubscriptionInfoItem}>
              <MaterialCommunityIcons name="calendar-start" size={20} color={COLORS.textSecondary} />
              <Text style={styles.currentSubscriptionInfoText}>
                Started: {formatDate(subscription.started_at)}
              </Text>
            </View>
            <View style={styles.currentSubscriptionInfoItem}>
              <MaterialCommunityIcons name="calendar-end" size={20} color={COLORS.textSecondary} />
              <Text style={styles.currentSubscriptionInfoText}>
                Expires: {formatDate(subscription.expires_at)}
              </Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.noSubscriptionCard}>
          <MaterialCommunityIcons name="alert-circle" size={48} color={COLORS.warning} />
          <Text style={styles.noSubscriptionTitle}>No Active Subscription</Text>
          <Text style={styles.noSubscriptionText}>
            Subscribe to unlock all features and connect to VPN
          </Text>
        </View>
      )}

      {/* Plans Section */}
      <View style={styles.plansSection}>
        <Text style={styles.sectionTitle}>Choose Your Plan</Text>
        {plans.map((plan) => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planCard,
              subscription?.plan === plan.id && styles.planCardActive,
            ]}
            onPress={() => handlePurchase(plan)}
            disabled={subscription?.plan === plan.id}
          >
            {subscription?.plan === plan.id && (
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>Current Plan</Text>
              </View>
            )}
            {plan.savings && (
              <View style={styles.savingsBadge}>
                <Text style={styles.savingsBadgeText}>{plan.savings}</Text>
              </View>
            )}
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <View style={styles.planPriceContainer}>
                <Text style={styles.planPrice}>${plan.price}</Text>
                <Text style={styles.planCurrency}>/{plan.duration}</Text>
              </View>
            </View>
            <Text style={styles.planDescription}>{plan.description}</Text>
            <View style={styles.planFeatures}>
              <View style={styles.planFeature}>
                <MaterialCommunityIcons name="check" size={20} color={COLORS.success} />
                <Text style={styles.planFeatureText}>Unlimited VPN connections</Text>
              </View>
              <View style={styles.planFeature}>
                <MaterialCommunityIcons name="check" size={20} color={COLORS.success} />
                <Text style={styles.planFeatureText}>High-speed servers</Text>
              </View>
              <View style={styles.planFeature}>
                <MaterialCommunityIcons name="check" size={20} color={COLORS.success} />
                <Text style={styles.planFeatureText}>24/7 support</Text>
              </View>
            </View>
            {subscription?.plan === plan.id ? (
              <View style={styles.planButtonDisabled}>
                <Text style={styles.planButtonTextDisabled}>Current Plan</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.planButton}
                onPress={() => handlePurchase(plan)}
              >
                <Text style={styles.planButtonText}>Subscribe</Text>
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Google Pay Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: 24 + insets.bottom }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Complete Purchase</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                disabled={purchasing}
              >
                <MaterialCommunityIcons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedPlan && (
              <>
                <View style={styles.paymentSummary}>
                  <Text style={styles.paymentSummaryTitle}>Order Summary</Text>
                  <View style={styles.paymentSummaryItem}>
                    <Text style={styles.paymentSummaryLabel}>{selectedPlan.name}</Text>
                    <Text style={styles.paymentSummaryValue}>${selectedPlan.price}</Text>
                  </View>
                  <View style={styles.paymentDivider} />
                  <View style={styles.paymentSummaryItem}>
                    <Text style={styles.paymentSummaryLabelTotal}>Total</Text>
                    <Text style={styles.paymentSummaryValueTotal}>${selectedPlan.price}</Text>
                  </View>
                </View>

                <View style={styles.paymentMethod}>
                  <Text style={styles.paymentMethodTitle}>Payment Method</Text>
                  <View style={styles.googlePayButton}>
                    <MaterialCommunityIcons name="google" size={32} color={COLORS.text} />
                    <Text style={styles.googlePayText}>Google Pay</Text>
                  </View>
                  <Text style={styles.paymentNote}>
                    This is a demo payment. No actual charge will be made.
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.buyButton, purchasing && styles.buyButtonDisabled]}
                  onPress={handlePaymentConfirm}
                  disabled={purchasing}
                >
                  {purchasing ? (
                    <ActivityIndicator color={COLORS.text} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="lock" size={20} color={COLORS.text} />
                      <Text style={styles.buyButtonText}>Buy Now</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  currentSubscriptionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.success,
  },
  currentSubscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentSubscriptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginLeft: 8,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 16,
  },
  currentSubscriptionInfo: {
    gap: 8,
  },
  currentSubscriptionInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currentSubscriptionInfoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  noSubscriptionCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 32,
    marginBottom: 24,
    alignItems: 'center',
  },
  noSubscriptionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noSubscriptionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  plansSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.border,
    position: 'relative',
  },
  planCardActive: {
    borderColor: COLORS.primary,
  },
  activeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  savingsBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  savingsBadgeText: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 8,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    flex: 1,
  },
  planPriceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  planCurrency: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  planDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  planFeatures: {
    marginBottom: 16,
    gap: 8,
  },
  planFeature: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planFeatureText: {
    fontSize: 14,
    color: COLORS.text,
    marginLeft: 8,
  },
  planButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  planButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  planButtonDisabled: {
    backgroundColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  planButtonTextDisabled: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  paymentSummary: {
    marginBottom: 24,
  },
  paymentSummaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  paymentSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentSummaryLabel: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  paymentSummaryValue: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: '500',
  },
  paymentSummaryLabelTotal: {
    fontSize: 18,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  paymentSummaryValueTotal: {
    fontSize: 20,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  paymentDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 12,
  },
  paymentMethod: {
    marginBottom: 24,
  },
  paymentMethodTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  googlePayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.backgroundLight,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 8,
  },
  googlePayText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12,
  },
  paymentNote: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  buyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  buyButtonDisabled: {
    opacity: 0.6,
  },
  buyButtonText: {
    color: COLORS.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SubscriptionScreen;

