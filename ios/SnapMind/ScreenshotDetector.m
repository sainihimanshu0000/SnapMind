#import <React/RCTEventEmitter.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <Photos/Photos.h>
#import <Vision/Vision.h>
#import <UIKit/UIKit.h>
#import "SnapMind-Swift.h"

@interface ScreenshotDetector : RCTEventEmitter <RCTBridgeModule, PHPhotoLibraryChangeObserver>
@end

@implementation ScreenshotDetector {
  BOOL _watching;
  PHFetchResult<PHAsset *> *_screenshotFetch;
  dispatch_block_t _debounce;
}

RCT_EXPORT_MODULE();

+ (BOOL)requiresMainQueueSetup
{
  return YES;
}

- (NSArray<NSString *> *)supportedEvents
{
  return @[@"onScreenshotsChanged"];
}

- (void)dealloc
{
  [self endWatching];
}

static NSString *StatusString(PHAuthorizationStatus status)
{
  switch (status) {
    case PHAuthorizationStatusAuthorized:
      return @"authorized";
    case PHAuthorizationStatusLimited:
      return @"limited";
    case PHAuthorizationStatusDenied:
    case PHAuthorizationStatusRestricted:
      return @"denied";
    default:
      return @"notDetermined";
  }
}

RCT_REMAP_METHOD(getCapabilities,
                 getCapabilitiesWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@{
    @"supported": @YES,
    @"platform": @"ios",
    @"automaticForeground": @YES,
    @"automaticBackground": @YES,
    @"canDeleteFromLibrary": @YES,
    @"canRunOnDeviceOcr": @YES,
    @"summary": @"SnapMind can notify you after a screenshot while the app is open, and iOS may check again in the background. If you swipe SnapMind away (force quit), iOS will not run SnapMind until you open it again.",
  });
}

RCT_REMAP_METHOD(getPermissionStatus,
                 getPermissionStatusWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  resolve(@{@"status": StatusString([PHPhotoLibrary authorizationStatusForAccessLevel:PHAccessLevelReadWrite])});
}

RCT_REMAP_METHOD(requestPermission,
                 requestPermissionWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [PHPhotoLibrary requestAuthorizationForAccessLevel:PHAccessLevelReadWrite handler:^(PHAuthorizationStatus status) {
    resolve(@{@"status": StatusString(status)});
  }];
}

RCT_REMAP_METHOD(startWatching,
                 startWatchingWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self beginWatching];
    [[ScreenshotWatch shared] setEnabled:YES];
    resolve(@{@"ok": @YES});
  });
}

RCT_REMAP_METHOD(stopWatching,
                 stopWatchingWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    [self endWatching];
    [[ScreenshotWatch shared] setEnabled:NO];
    resolve(@{@"ok": @YES});
  });
}

RCT_REMAP_METHOD(getNewScreenshots,
                 getNewScreenshots:(nonnull NSNumber *)sinceMs
                 limit:(nonnull NSNumber *)limit
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  PHAuthorizationStatus status = [PHPhotoLibrary authorizationStatusForAccessLevel:PHAccessLevelReadWrite];
  if (status != PHAuthorizationStatusAuthorized && status != PHAuthorizationStatusLimited) {
    resolve(@[]);
    return;
  }

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSDate *since = [NSDate dateWithTimeIntervalSince1970:sinceMs.doubleValue / 1000.0];
    resolve([self serializeAssetsSince:since limit:limit.integerValue]);
  });
}

RCT_REMAP_METHOD(copyAsset,
                 copyAsset:(NSString *)assetId
                 toPath:(NSString *)toPath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  PHAsset *asset = [self assetWithId:assetId];
  if (!asset) {
    reject(@"not_found", @"That screenshot is no longer in Photos.", nil);
    return;
  }

  PHImageRequestOptions *options = [PHImageRequestOptions new];
  options.version = PHImageRequestOptionsVersionCurrent;
  options.deliveryMode = PHImageRequestOptionsDeliveryModeHighQualityFormat;
  options.networkAccessAllowed = YES;

  [[PHImageManager defaultManager] requestImageDataAndOrientationForAsset:asset
                                                                  options:options
                                                            resultHandler:^(NSData *data, NSString *uti, CGImagePropertyOrientation orientation, NSDictionary *info) {
    if ([info[PHImageCancelledKey] boolValue]) {
      reject(@"cancelled", @"Copy was cancelled.", nil);
      return;
    }
    if (!data) {
      reject(@"copy_failed", @"Could not read the screenshot.", nil);
      return;
    }
    NSURL *dest = [NSURL fileURLWithPath:toPath];
    NSError *error = nil;
    [[NSFileManager defaultManager] createDirectoryAtURL:[dest URLByDeletingLastPathComponent]
                             withIntermediateDirectories:YES
                                              attributes:nil
                                                   error:&error];
    if (error || ![data writeToURL:dest options:NSDataWritingAtomic error:&error]) {
      reject(@"copy_failed", error.localizedDescription ?: @"Could not save the screenshot.", error);
      return;
    }
    resolve(@{@"uri": dest.absoluteString ?: @"", @"path": dest.path ?: toPath});
  }];
}

RCT_REMAP_METHOD(deleteAsset,
                 deleteAsset:(NSString *)assetId
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  PHAsset *asset = [self assetWithId:assetId];
  if (!asset) {
    resolve(@{@"ok": @NO, @"cancelled": @NO, @"message": @"That screenshot is no longer in Photos."});
    return;
  }

  [[PHPhotoLibrary sharedPhotoLibrary] performChanges:^{
    [PHAssetChangeRequest deleteAssets:@[asset]];
  } completionHandler:^(BOOL success, NSError *error) {
    if (error) {
      resolve(@{
        @"ok": @NO,
        @"cancelled": @YES,
        @"message": error.localizedDescription ?: @"Photos did not delete the screenshot.",
      });
      return;
    }
    resolve(@{
      @"ok": @(success),
      @"cancelled": @(!success),
    });
  }];
}

RCT_REMAP_METHOD(recognizeText,
                 recognizeText:(NSString *)filePath
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  NSString *path = [filePath stringByReplacingOccurrencesOfString:@"file://" withString:@""];
  UIImage *image = [UIImage imageWithContentsOfFile:path];
  if (!image.CGImage) {
    resolve(@{@"ok": @NO, @"text": @"", @"message": @"Could not open that image for text recognition."});
    return;
  }

  VNRecognizeTextRequest *request = [[VNRecognizeTextRequest alloc] initWithCompletionHandler:^(VNRequest *req, NSError *error) {
    if (error) {
      resolve(@{@"ok": @NO, @"text": @"", @"message": @"On-device text recognition failed."});
      return;
    }
    NSMutableArray<NSString *> *lines = [NSMutableArray new];
    for (VNRecognizedTextObservation *observation in req.results) {
      VNRecognizedText *candidate = [[observation topCandidates:1] firstObject];
      if (candidate.string.length) {
        [lines addObject:candidate.string];
      }
    }
    NSString *text = [[lines componentsJoinedByString:@"\n"] stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    resolve(@{
      @"ok": @(text.length > 0),
      @"text": text ?: @"",
      @"message": text.length ? [NSNull null] : @"No text found.",
    });
  }];
  request.recognitionLevel = VNRequestTextRecognitionLevelAccurate;
  request.usesLanguageCorrection = YES;

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), ^{
    NSError *error = nil;
    VNImageRequestHandler *handler = [[VNImageRequestHandler alloc] initWithCGImage:image.CGImage options:@{}];
    [handler performRequests:@[request] error:&error];
    if (error) {
      resolve(@{@"ok": @NO, @"text": @"", @"message": @"On-device text recognition failed."});
    }
  });
}

RCT_REMAP_METHOD(setClipboard,
                 setClipboard:(NSString *)text
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  UIPasteboard.generalPasteboard.string = text;
  resolve(@{@"ok": @YES});
}

RCT_REMAP_METHOD(scanAndNotify,
                 scanAndNotifyWithResolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [[ScreenshotWatch shared] scanAndNotifyIfNeeded];
  resolve(@{@"ok": @YES});
}

RCT_REMAP_METHOD(setLastScanMs,
                 setLastScanMs:(nonnull NSNumber *)ms
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  [[ScreenshotWatch shared] setLastScanMs:ms.doubleValue];
  resolve(@{@"ok": @YES});
}

- (void)photoLibraryDidChange:(PHChange *)changeInstance
{
  if (!_screenshotFetch) {
    return;
  }
  PHFetchResultChangeDetails *details = [changeInstance changeDetailsForFetchResult:_screenshotFetch];
  if (!details) {
    return;
  }
  _screenshotFetch = details.fetchResultAfterChanges;
  if (details.insertedObjects.count == 0) {
    return;
  }
  [self emitChanged];
}

- (void)beginWatching
{
  if (_watching) {
    return;
  }
  _watching = YES;
  [[PHPhotoLibrary sharedPhotoLibrary] registerChangeObserver:self];
  _screenshotFetch = [self fetchResult];
  [[NSNotificationCenter defaultCenter] addObserver:self
                                           selector:@selector(handleScreenshotNotification)
                                               name:UIApplicationUserDidTakeScreenshotNotification
                                             object:nil];
}

- (void)endWatching
{
  if (!_watching) {
    return;
  }
  _watching = NO;
  [[PHPhotoLibrary sharedPhotoLibrary] unregisterChangeObserver:self];
  [[NSNotificationCenter defaultCenter] removeObserver:self
                                                  name:UIApplicationUserDidTakeScreenshotNotification
                                                object:nil];
  if (_debounce) {
    dispatch_block_cancel(_debounce);
    _debounce = nil;
  }
}

- (void)handleScreenshotNotification
{
  [self emitChanged];
}

- (void)emitChanged
{
  if (_debounce) {
    dispatch_block_cancel(_debounce);
  }
  __weak __typeof(self) weakSelf = self;
  dispatch_block_t work = dispatch_block_create(0, ^{
    __strong __typeof(weakSelf) strongSelf = weakSelf;
    if (!strongSelf) {
      return;
    }
    [strongSelf sendEventWithName:@"onScreenshotsChanged" body:@{@"reason": @"library"}];
    [[ScreenshotWatch shared] scanAndNotifyIfNeeded];
  });
  _debounce = work;
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(2.0 * NSEC_PER_SEC)), dispatch_get_main_queue(), work);
}

RCT_REMAP_METHOD(shareFile,
                 shareFile:(NSString *)path
                 mimeType:(NSString *)mimeType
                 title:(NSString *)title
                 resolver:(RCTPromiseResolveBlock)resolve
                 rejecter:(RCTPromiseRejectBlock)reject)
{
  dispatch_async(dispatch_get_main_queue(), ^{
    NSString *clean = [path stringByReplacingOccurrencesOfString:@"file://" withString:@""];
    NSURL *url = [NSURL fileURLWithPath:clean];
    if (!url || ![[NSFileManager defaultManager] fileExistsAtPath:clean]) {
      reject(@"NO_FILE", @"Export file was not found", nil);
      return;
    }
    UIViewController *presenter = RCTPresentedViewController();
    if (!presenter) {
      reject(@"NO_ACTIVITY", @"No screen available to share", nil);
      return;
    }
    UIActivityViewController *controller =
        [[UIActivityViewController alloc] initWithActivityItems:@[url] applicationActivities:nil];
    controller.popoverPresentationController.sourceView = presenter.view;
    controller.popoverPresentationController.sourceRect =
        CGRectMake(CGRectGetMidX(presenter.view.bounds), CGRectGetMidY(presenter.view.bounds), 1, 1);
    [presenter presentViewController:controller animated:YES completion:^{
      resolve(@{@"ok": @YES});
    }];
  });
}

- (PHFetchResult<PHAsset *> *)fetchResult
{
  PHFetchResult<PHAssetCollection *> *collections =
      [PHAssetCollection fetchAssetCollectionsWithType:PHAssetCollectionTypeSmartAlbum
                                               subtype:PHAssetCollectionSubtypeSmartAlbumScreenshots
                                               options:nil];
  PHFetchOptions *options = [PHFetchOptions new];
  options.sortDescriptors = @[[NSSortDescriptor sortDescriptorWithKey:@"creationDate" ascending:NO]];
  PHAssetCollection *album = collections.firstObject;
  if (album) {
    return [PHAsset fetchAssetsInAssetCollection:album options:options];
  }
  options.predicate = [NSPredicate predicateWithFormat:@"(mediaSubtype & %d) != 0", PHAssetMediaSubtypePhotoScreenshot];
  return [PHAsset fetchAssetsWithMediaType:PHAssetMediaTypeImage options:options];
}

- (NSArray *)serializeAssetsSince:(NSDate *)since limit:(NSInteger)limit
{
  PHFetchResult<PHAsset *> *result = [self fetchResult];
  NSMutableArray *assets = [NSMutableArray new];
  [result enumerateObjectsUsingBlock:^(PHAsset *asset, NSUInteger idx, BOOL *stop) {
    if (!asset.creationDate) {
      return;
    }
    if ([asset.creationDate compare:since] == NSOrderedAscending) {
      *stop = YES;
      return;
    }
    NSDictionary *row = [self serializeAsset:asset];
    if (row) {
      [assets addObject:row];
    }
    if ((NSInteger)assets.count >= limit) {
      *stop = YES;
    }
  }];
  return assets;
}

- (PHAsset *)assetWithId:(NSString *)assetId
{
  return [PHAsset fetchAssetsWithLocalIdentifiers:@[assetId] options:nil].firstObject;
}

- (NSDictionary *)serializeAsset:(PHAsset *)asset
{
  if (!asset.creationDate) {
    return nil;
  }
  NSString *filename = @"screenshot.jpg";
  PHAssetResource *resource = [PHAssetResource assetResourcesForAsset:asset].firstObject;
  if (resource.originalFilename.length) {
    filename = resource.originalFilename;
  }
  return @{
    @"id": asset.localIdentifier,
    @"createdAt": @(asset.creationDate.timeIntervalSince1970 * 1000.0),
    @"width": @(asset.pixelWidth),
    @"height": @(asset.pixelHeight),
    @"filename": filename,
    @"mediaType": @"screenshot",
  };
}

@end
