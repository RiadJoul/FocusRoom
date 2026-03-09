#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(MissionStateModule, NSObject)

RCT_EXTERN_METHOD(setTodayTasks:(NSArray *)titles)
RCT_EXTERN_METHOD(setHabitSnapshot:(NSArray *)levels)
RCT_EXTERN_METHOD(startLiveActivity:(NSString *)title endTimestampSeconds:(nonnull NSNumber *)endTimestampSeconds)
RCT_EXTERN_METHOD(updateLiveActivityProgress:(nonnull NSNumber *)progress)
RCT_EXTERN_METHOD(endLiveActivities)

@end
