import { Linking, Modal, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
} from 'react-native-reanimated';

interface NewVersionModalProps {
    visible: boolean;
    latestVersion: string | null;
    onClose: () => void;
}


const handleRedirectToStore = () => {
    const url = 'https://apps.apple.com/us/app/focusroom-block-distractions/id6754952142';
    Linking.openURL(url);
}

export function NewVersionModal({ visible, latestVersion, onClose }: NewVersionModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View className="flex-1 bg-black/50 items-center justify-center px-6">
                <Animated.View
                    entering={FadeIn.duration(400)}
                    className="bg-white rounded-3xl p-8 w-full max-w-md"
                >
                    {/* Title */}
                    <Animated.Text
                        entering={FadeInDown}
                        className="text-background font-primary-bold text-2xl mb-2"
                    >
                        New Version Available! 🎉
                    </Animated.Text>

                    {/* Subtitle */}
                    <Animated.View
                        entering={FadeInDown.delay(200)}
                        className="bg-gray-200 rounded-2xl p-6 mb-6 mt-6"
                    >
                        <Text className="text-gray-700 font-primary-semibold text-base mb-4">
                            A new version of FocusRoom is available: {latestVersion}
                        </Text>

                        <Animated.View
                            entering={FadeInDown.delay(450)}
                            className="flex-row items-center"
                        >
                            <Text className="text-gray-700 font-primary-medium text-base">
                                Please update to enjoy the latest features and improvements! 🚀
                            </Text>
                        </Animated.View>
                    </Animated.View>

                    {/* Button */}
                    <Animated.View className="gap-y-2">
                        <TouchableOpacity
                            onPress={handleRedirectToStore}
                            className={`py-4 rounded-xl items-center bg-green-800 px-6`}
                            activeOpacity={0.8}
                        >
                            <Text className={`font-primary-bold text-lg text-white`}>
                                Update Now
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onClose}
                            className={`py-4 rounded-xl items-center bg-black`}
                            activeOpacity={0.8}
                        >
                            <Text className={`font-primary-bold text-lg text-white`}>
                                Close
                            </Text>
                        </TouchableOpacity>

                    </Animated.View>
                </Animated.View>
            </View>
        </Modal>
    );
}
