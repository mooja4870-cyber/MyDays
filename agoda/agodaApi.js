const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { SEARCH_CONFIG, LINK_PRICE_CID } = require('./config');
const { 
  generateUserId, 
  generateSearchId, 
  generateCorrelationId, 
  generateRequestId, 
  generateSessionId, 
  generateRandomIP, 
  generateCookieId, 
  getCheckInDates,
  getRandomHotel
} = require('./utils');
const { organizeHotelInfo } = require('./hotelProcessor');
const { saveHotelToFile } = require('./fileHandler');

// GraphQL 쿼리 생성
function createGraphQLQuery() {
  return `
    query citySearch($CitySearchRequest: CitySearchRequest!, $ContentSummaryRequest: ContentSummaryRequest!, $PricingSummaryRequest: PricingRequestParameters, $PriceStreamMetaLabRequest: PriceStreamMetaLabRequest) {
  citySearch(CitySearchRequest: $CitySearchRequest) {
    featuredPulseProperties(ContentSummaryRequest: $ContentSummaryRequest, PricingSummaryRequest: $PricingSummaryRequest) {
      propertyId
      propertyResultType
      pricing {
        pulseCampaignMetadata {
          promotionTypeId
          webCampaignId
          campaignTypeId
          campaignBadgeText
          campaignBadgeDescText
          dealExpiryTime
          showPulseMerchandise
        }
        isAvailable
        isReady
        offers {
          roomOffers {
            room {
              pricing {
                currency
                price {
                  perNight {
                    exclusive {
                      crossedOutPrice
                      display
                    }
                    inclusive {
                      crossedOutPrice
                      display
                    }
                  }
                  perRoomPerNight {
                    exclusive {
                      crossedOutPrice
                      display
                    }
                    inclusive {
                      crossedOutPrice
                      display
                    }
                  }
                }
              }
            }
          }
        }
      }
      content {
        reviews {
          contentReview {
            isDefault
            providerId
            cumulative {
              reviewCount
              score
            }
          }
          cumulative {
            reviewCount
            score
          }
        }
        images {
          hotelImages {
            urls {
              value
            }
          }
        }
        informationSummary {
          hasHostExperience
          displayName
          rating
          propertyLinks {
            propertyPage
          }
          address {
            country {
              id
            }
            area {
              name
            }
            city {
              name
            }
          }
          nhaSummary {
            hostType
          }
        }
      }
    }
    searchResult {
      sortMatrix {
        result {
          fieldId
          sorting {
            sortField
            sortOrder
            sortParams {
              id
            }
          }
          display {
            name
          }
          childMatrix {
            fieldId
            sorting {
              sortField
              sortOrder
              sortParams {
                id
              }
            }
            display {
              name
            }
            childMatrix {
              fieldId
              sorting {
                sortField
                sortOrder
                sortParams {
                  id
                }
              }
              display {
                name
              }
            }
          }
        }
      }
      searchInfo {
        hasSecretDeal
        isComplete
        totalFilteredHotels
        hasEscapesPackage
        searchStatus {
          searchCriteria {
            checkIn
          }
          searchStatus
        }
        objectInfo {
          objectName
          cityName
          cityEnglishName
          countryId
          countryEnglishName
          mapLatitude
          mapLongitude
          mapZoomLevel
          wlPreferredCityName
          wlPreferredCountryName
          cityId
          cityCenterPolygon {
            geoPoints {
              lon
              lat
            }
            touristAreaCenterPoint {
              lon
              lat
            }
          }
        }
      }
      urgencyDetail {
        urgencyScore
      }
      histogram {
        bins {
          numOfElements
          upperBound {
            perNightPerRoom
            perPax
          }
        }
      }
      nhaProbability
    }
    properties(ContentSummaryRequest: $ContentSummaryRequest, PricingSummaryRequest: $PricingSummaryRequest, PriceStreamMetaLabRequest: $PriceStreamMetaLabRequest) {
      propertyId
      sponsoredDetail {
        sponsoredType
        trackingData
        isShowSponsoredFlag
      }
      propertyResultType
      content {
        informationSummary {
          hotelCharacter {
            hotelTag {
              name
              symbol
            }
            hotelView {
              name
              symbol
            }
          }
          propertyLinks {
            propertyPage
          }
          atmospheres {
            id
            name
          }
          isSustainableTravel
          localeName
          defaultName
          displayName
          accommodationType
          awardYear
          hasHostExperience
          nhaSummary {
            hostPropertyCount
          }
          address {
            countryCode
            country {
              id
              name
            }
            city {
              id
              name
            }
            area {
              id
              name
            }
          }
          propertyType
          rating
          agodaGuaranteeProgram
          remarks {
            renovationInfo {
              renovationType
              year
            }
          }
          spokenLanguages {
            id
          }
          geoInfo {
            latitude
            longitude
          }
        }
        propertyEngagement {
          lastBooking
          peopleLooking
        }
        nonHotelAccommodation {
          masterRooms {
            noOfBathrooms
            noOfBedrooms
            noOfBeds
            roomSizeSqm
            highlightedFacilities
          }
          hostLevel {
            id
            name
          }
          supportedLongStay
        }
        facilities {
          id
        }
        images {
          hotelImages {
            id
            caption
            providerId
            urls {
              key
              value
            }
          }
        }
        reviews {
          contentReview {
            isDefault
            providerId
            demographics {
              groups {
                id
                grades {
                  id
                  score
                }
              }
            }
            summaries {
              recommendationScores {
                recommendationScore
              }
              snippets {
                countryId
                countryCode
                countryName
                date
                demographicId
                demographicName
                reviewer
                reviewRating
                snippet
              }
            }
            cumulative {
              reviewCount
              score
            }
          }
          cumulative {
            reviewCount
            score
          }
          cumulativeForHost {
            hostAvgHotelReviewRating
            hostHotelReviewTotalCount
          }
        }
        familyFeatures {
          hasChildrenFreePolicy
          isFamilyRoom
          hasMoreThanOneBedroom
          isInterConnectingRoom
          isInfantCottageAvailable
          hasKidsPool
          hasKidsClub
        }
        personalizedInformation {
          childrenFreePolicy {
            fromAge
            toAge
          }
        }
        localInformation {
          landmarks {
            transportation {
              landmarkName
              distanceInM
            }
            topLandmark {
              landmarkName
              distanceInM
            }
            beach {
              landmarkName
              distanceInM
            }
          }
          hasAirportTransfer
        }
        highlight {
          cityCenter {
            distanceFromCityCenter
          }
          favoriteFeatures {
            features {
              id
              title
              category
            }
          }
          hasNearbyPublicTransportation
        }
        rateCategories {
          escapeRateCategories {
            rateCategoryId
            localizedRateCategoryName
          }
        }
      }
      soldOut {
        soldOutPrice {
          averagePrice
        }
      }
      pricing {
        pulseCampaignMetadata {
          promotionTypeId
          webCampaignId
          campaignTypeId
          campaignBadgeText
          campaignBadgeDescText
          dealExpiryTime
          showPulseMerchandise
        }
        isAvailable
        isReady
        benefits
        cheapestRoomOffer {
          agodaCash {
            showBadge
            giftcardGuid
            dayToEarn
            earnId
            percentage
            expiryDay
          }
          cashback {
            cashbackGuid
            showPostCashbackPrice
            cashbackVersion
            percentage
            earnId
            dayToEarn
            expiryDay
            cashbackType
            appliedCampaignName
          }
        }
        isEasyCancel
        isInsiderDeal
        suggestPriceType {
          suggestPrice
        }
        roomBundle {
          bundleId
          bundleType
          saveAmount {
            perNight {
              ...Fragc839f7bd7h92gcba7549
            }
          }
        }
        pointmax {
          channelId
          point
        }
        priceChange {
          changePercentage
          searchDate
        }
        payment {
          cancellation {
            cancellationType
            freeCancellationDate
          }
          payLater {
            isEligible
          }
          payAtHotel {
            isEligible
          }
          noCreditCard {
            isEligible
          }
          taxReceipt {
            isEligible
          }
        }
        cheapestStayPackageRatePlans {
          stayPackageType
          ratePlanId
        }
        pricingMessages {
          location
          ids
        }
        suppliersSummaries {
          id
          supplierHotelId
        }
        supplierInfo {
          id
          name
          isAgodaBand
        }
        childPolicy {
          freeChildren
        }
        growthProgramInfo {
          badges
        }
        offers {
          bundleType
          bundleDetail {
            bundleSegmentRoomIdentifiers {
              quantity
            }
          }
          roomOffers {
            room {
              extraPriceInfo {
                displayPriceWithSurchargesPRPN
                corDisplayPriceWithSurchargesPRPN
              }
              availableRooms
              isPromoEligible
              promotions {
                typeId
                promotionDiscount {
                  value
                }
                isRatePlanAsPromotion
                cmsTypeId
                description
              }
              consolidatedAppliedDiscount {
                totalDiscountJacketMessage
                breakdowns {
                  title
                }
              }
              bookingDuration {
                unit
                value
              }
              supplierId
              corSummary {
                hasCor
                corType
                isOriginal
                hasOwnCOR
                isBlacklistedCor
              }
              localVoucher {
                currencyCode
                amount
              }
              pricing {
                currency
                price {
                  perNight {
                    exclusive {
                      display
                      cashbackPrice
                      displayAfterCashback
                      originalPrice
                    }
                    inclusive {
                      display
                      cashbackPrice
                      displayAfterCashback
                      originalPrice
                    }
                  }
                  perBook {
                    exclusive {
                      display
                      cashbackPrice
                      displayAfterCashback
                      rebatePrice
                      originalPrice
                      autoAppliedPromoDiscount
                    }
                    inclusive {
                      display
                      cashbackPrice
                      displayAfterCashback
                      rebatePrice
                      originalPrice
                      autoAppliedPromoDiscount
                    }
                  }
                  perRoomPerNight {
                    exclusive {
                      display
                      crossedOutPrice
                      cashbackPrice
                      displayAfterCashback
                      rebatePrice
                      pseudoCouponPrice
                      originalPrice
                      loyaltyOfferSummary {
                        basePrice {
                          exclusive
                          allInclusive
                        }
                        status
                        offers {
                          identifier
                          status
                          burn {
                            points
                            payableAmount
                          }
                          earn {
                            points
                          }
                          offerType
                          isSelected
                        }
                      }
                    }
                    inclusive {
                      display
                      crossedOutPrice
                      cashbackPrice
                      displayAfterCashback
                      rebatePrice
                      pseudoCouponPrice
                      originalPrice
                      loyaltyOfferSummary {
                        basePrice {
                          exclusive
                          allInclusive
                        }
                        status
                        offers {
                          identifier
                          status
                          burn {
                            points
                            payableAmount
                          }
                          earn {
                            points
                          }
                          offerType
                          isSelected
                        }
                      }
                    }
                  }
                  totalDiscount
                  priceAfterAppliedAgodaCash {
                    perBook {
                      ...Frag37i67ba8c18dhh1645ba
                    }
                    perRoomPerNight {
                      ...Frag37i67ba8c18dhh1645ba
                    }
                  }
                }
                apsPeek {
                  perRoomPerNight {
                    ...Fragc839f7bd7h92gcba7549
                  }
                }
                promotionPricePeek {
                  display {
                    perBook {
                      ...Fragc839f7bd7h92gcba7549
                    }
                    perRoomPerNight {
                      ...Fragc839f7bd7h92gcba7549
                    }
                    perNight {
                      ...Fragc839f7bd7h92gcba7549
                    }
                  }
                  discountType
                  promotionCodeType
                  promotionCode
                  promoAppliedOnFinalPrice
                  childPromotions {
                    campaignId
                  }
                  campaignName
                }
                channelDiscountSummary {
                  channelDiscountBreakdown {
                    display
                    discountPercent
                    channelId
                  }
                }
                promotionsCumulative {
                  promotionCumulativeType
                  amountPercentage
                  minNightsStay
                }
              }
              uid
              payment {
                cancellation {
                  cancellationType
                }
              }
              discount {
                deals
                channelDiscount
              }
              saveUpTo {
                perRoomPerNight
              }
              benefits {
                id
                targetType
              }
              channel {
                id
              }
              mseRoomSummaries {
                supplierId
                subSupplierId
                pricingSummaries {
                  currency
                  channelDiscountSummary {
                    channelDiscountBreakdown {
                      channelId
                      discountPercent
                      display
                    }
                  }
                  price {
                    perRoomPerNight {
                      exclusive {
                        display
                      }
                      inclusive {
                        display
                      }
                    }
                  }
                }
              }
              cashback {
                cashbackGuid
                showPostCashbackPrice
                cashbackVersion
                percentage
                earnId
                dayToEarn
                expiryDay
                cashbackType
                appliedCampaignName
              }
              agodaCash {
                showBadge
                giftcardGuid
                dayToEarn
                expiryDay
                percentage
              }
              corInfo {
                corBreakdown {
                  taxExPN {
                    ...Frag04eceagi1977aicacg98
                  }
                  taxInPN {
                    ...Frag04eceagi1977aicacg98
                  }
                  taxExPRPN {
                    ...Frag04eceagi1977aicacg98
                  }
                  taxInPRPN {
                    ...Frag04eceagi1977aicacg98
                  }
                }
                corInfo {
                  corType
                }
              }
              loyaltyDisplay {
                items
              }
              capacity {
                extraBedsAvailable
              }
              pricingMessages {
                formatted {
                  location
                  texts {
                    index
                    text
                  }
                }
              }
              campaign {
                selected {
                  campaignId
                  promotionId
                  messages {
                    campaignName
                    title
                    titleWithDiscount
                    description
                    linkOutText
                    url
                  }
                }
              }
              stayPackageType
            }
          }
        }
      }
      metaLab {
        attributes {
          attributeId
          dataType
          value
          version
        }
      }
      enrichment {
        topSellingPoint {
          tspType
          value
        }
        pricingBadges {
          badges
        }
        uniqueSellingPoint {
          rank
          segment
          uspType
          uspPropertyType
        }
        bookingHistory {
          bookingCount {
            count
            timeFrame
          }
        }
        showReviewSnippet
        isPopular
        roomInformation {
          cheapestRoomSizeSqm
          facilities {
            id
            propertyFacilityName
            symbol
          }
        }
      }
    }
    searchEnrichment {
      suppliersInformation {
        supplierId
        supplierName
        isAgodaBand
      }
    }
    aggregation {
      matrixGroupResults {
        matrixGroup
        matrixItemResults {
          id
          name
          count
          filterKey
          filterRequestType
          extraDataResults {
            text
            matrixExtraDataType
          }
        }
      }
    }
  }
}
fragment Frag37i67ba8c18dhh1645ba on DisplayPrice {
  exclusive
  allInclusive
}
fragment Fragc839f7bd7h92gcba7549 on DFDisplayPrice {
  exclusive
  allInclusive
}
fragment Frag04eceagi1977aicacg98 on DFCorBreakdownItem {
  price
  id
}
`;
}

// 요청 데이터 생성
function createRequestData(currentCityId, page, dates, ids) {
  const { userId, searchId, correlationId, requestId, sessionId, ipAddress, cookieId } = ids;
  
  return {
    operationName: "citySearch",
    variables: {
      CitySearchRequest: {
        cityId: currentCityId,
        searchRequest: {
          searchCriteria: {
            isAllowBookOnRequest: true,
            bookingDate: dates.bookingDate,
            checkInDate: dates.checkInDate,
            localCheckInDate: dates.localCheckInDate,
            los: SEARCH_CONFIG.LENGTH_OF_STAY,
            rooms: SEARCH_CONFIG.ROOMS,
            adults: SEARCH_CONFIG.ADULTS,
            children: SEARCH_CONFIG.CHILDREN,
            childAges: [],
            ratePlans: [],
            featureFlagRequest: {
              fetchNamesForTealium: true,
              fiveStarDealOfTheDay: true,
              isAllowBookOnRequest: false,
              showUnAvailable: true,
              showRemainingProperties: true,
              isMultiHotelSearch: false,
              enableAgencySupplyForPackages: true,
              flags: [
                {
                  feature: "FamilyChildFriendlyPopularFilter",
                  enable: true,
                },
                {
                  feature: "FamilyChildFriendlyPropertyTypeFilter",
                  enable: true,
                },
                {
                  feature: "FamilyMode",
                  enable: false,
                },
              ],
              enablePageToken: false,
              enableDealsOfTheDayFilter: false,
              isEnableSupplierFinancialInfo: false,
              ignoreRequestedNumberOfRoomsForNha: false,
              isFlexibleMultiRoomSearch: true,
            },
            isUserLoggedIn: false,
            currency: SEARCH_CONFIG.CURRENCY,
            travellerType: "Couple",
            isAPSPeek: false,
            enableOpaqueChannel: false,
            isEnabledPartnerChannelSelection: null,
            sorting: {
              sortField: SEARCH_CONFIG.SORT_FIELD,
              sortOrder: SEARCH_CONFIG.SORT_ORDER,
              sortParams: null,
            },
            requiredBasis: "PRPN",
            requiredPrice: "Exclusive",
            suggestionLimit: 0,
            synchronous: false,
            supplierPullMetadataRequest: null,
            isRoomSuggestionRequested: false,
            isAPORequest: false,
            hasAPOFilter: false,
          },
          searchContext: {
            userId: userId,
            memberId: 0,
            locale: SEARCH_CONFIG.LOCALE,
            cid: 1918967,
            origin: SEARCH_CONFIG.ORIGIN,
            platform: 1,
            deviceTypeId: 1,
            experiments: {
              forceByVariant: null,
              forceByExperiment: [
                {
                  id: "JGCW-204",
                  variant: "B",
                },
              ],
            },
            isRetry: false,
            showCMS: false,
            storeFrontId: 3,
            pageTypeId: 103,
            whiteLabelKey: null,
            ipAddress: ipAddress,
            endpointSearchType: "CitySearch",
            trackSteps: null,
            searchId: searchId,
          },
          matrix: null,
          matrixGroup: [
            {
              matrixGroup: "MetroSubwayStationLandmarkIds",
              size: 20,
            },
            {
              matrixGroup: "AtmosphereIds",
              size: 100,
            },
            {
              matrixGroup: "ReviewLocationScore",
              size: 3,
            },
            {
              matrixGroup: "LandmarkSubTypeCategoryIds",
              size: 20,
            },
            {
              matrixGroup: "Deals",
              size: 100,
            },
            {
              matrixGroup: "StarRating",
              size: 20,
            },
            {
              matrixGroup: "CityCenterDistance",
              size: 100,
            },
            {
              matrixGroup: "AllGuestReviewBreakdown",
              size: 100,
            },
            {
              matrixGroup: "RecommendedByDestinationCity",
              size: 10,
            },
            {
              matrixGroup: "BusStationLandmarkIds",
              size: 20,
            },
            {
              matrixGroup: "AccommodationType",
              size: 100,
            },
            {
              matrixGroup: "GroupedBedTypes",
              size: 100,
            },
            {
              matrixGroup: "BeachAccessTypeIds",
              size: 100,
            },
            {
              matrixGroup: "PopularForFamily",
              size: 5,
            },
            {
              matrixGroup: "AffordableCategory",
              size: 100,
            },
            {
              matrixGroup: "TrainStationLandmarkIds",
              size: 20,
            },
            {
              matrixGroup: "LandmarkIds",
              size: 10,
            },
            {
              matrixGroup: "KidsStayForFree",
              size: 5,
            },
            {
              matrixGroup: "ProductType",
              size: 100,
            },
            {
              matrixGroup: "RoomAmenities",
              size: 100,
            },
            {
              matrixGroup: "HotelFacilities",
              size: 100,
            },
            {
              matrixGroup: "PaymentOptions",
              size: 100,
            },
            {
              matrixGroup: "HotelChainId",
              size: 10,
            },
            {
              matrixGroup: "TripPurpose",
              size: 5,
            },
            {
              matrixGroup: "RoomBenefits",
              size: 100,
            },
            {
              matrixGroup: "NumberOfBedrooms",
              size: 100,
            },
            {
              matrixGroup: "HotelAreaId",
              size: 100,
            },
            {
              matrixGroup: "ReviewScore",
              size: 100,
            },
          ],
          filterRequest: {
            idsFilters: [],
            rangeFilters: [{
              filterKey: "Price",
              ranges: [{
                from: 250000,
                to: 10000000
              }]
            }],
            textFilters: [],
          },
          page: {
            pageSize: SEARCH_CONFIG.PAGE_SIZE,
            pageNumber: page,
            pageToken: "",
          },
          apoRequest: {
            apoPageSize: 10,
          },
          searchHistory: [
            {
              objectId: 670682,
              searchDate: "2024-10-22",
              searchType: "PropertySearch",
              childrenAges: [],
            },
            {
              objectId: 13507845,
              searchDate: "2024-10-22",
              searchType: "PropertySearch",
              childrenAges: [],
            },
            {
              objectId: 239609,
              searchDate: "2024-10-22",
              searchType: "PropertySearch",
              childrenAges: [],
            },
            {
              objectId: 8939657,
              searchDate: "2024-10-22",
              searchType: "PropertySearch",
              childrenAges: [],
            },
            {
              objectId: 13507845,
              searchDate: "2024-10-22",
              searchType: "PropertySearch",
              childrenAges: [],
            },
            {
              objectId: 8939657,
              searchDate: "2024-10-22",
              searchType: "PropertySearch",
              childrenAges: [],
            },
          ],
          searchDetailRequest: {
            priceHistogramBins: 50,
          },
          isTrimmedResponseRequested: false,
          featuredAgodaHomesRequest: null,
          featuredLuxuryHotelsRequest: null,
          highlyRatedAgodaHomesRequest: {
            numberOfAgodaHomes: 30,
            minimumReviewScore: 7.5,
            minimumReviewCount: SEARCH_CONFIG.MIN_REVIEW_COUNT,
            accommodationTypes: [
              28, 29, 30, 102, 103, 106, 107, 108, 109, 110, 114, 115,
              120, 131,
            ],
            sortVersion: 0,
          },
          extraAgodaHomesRequest: null,
          extraHotels: {
            extraHotelIds: [],
            enableFiltersForExtraHotels: false,
          },
          packaging: null,
          rankingRequest: {
            isNhaKeywordSearch: false,
          },
          rocketmilesRequestV2: null,
          featuredPulsePropertiesRequest: {
            numberOfPulseProperties: 15,
          },
        },
      },
      ContentSummaryRequest: {
        context: {
          rawUserId: userId,
          memberId: 0,
          userOrigin: SEARCH_CONFIG.ORIGIN,
          locale: SEARCH_CONFIG.LOCALE,
          forceExperimentsByIdNew: [
            {
              key: "JGCW-204",
              value: "B",
            },
          ],
          apo: false,
          searchCriteria: {
            cityId: currentCityId,
          },
          platform: {
            id: 1,
          },
          storeFrontId: 3,
          cid: "1918967",
          occupancy: {
            numberOfAdults: SEARCH_CONFIG.ADULTS,
            numberOfChildren: SEARCH_CONFIG.CHILDREN,
            travelerType: 3,
            checkIn: dates.checkIn,
          },
          deviceTypeId: 1,
          whiteLabelKey: "",
          correlationId: correlationId,
        },
        summary: {
          highlightedFeaturesOrderPriority: null,
          includeHotelCharacter: true,
        },
        reviews: {
          commentary: null,
          demographics: {
            providerIds: null,
            filter: {
              defaultProviderOnly: true,
            },
          },
          summaries: {
            providerIds: null,
            apo: true,
            limit: 1,
            travellerType: 3,
          },
          cumulative: {
            providerIds: null,
          },
          filters: null,
        },
        images: {
          page: null,
          maxWidth: 0,
          maxHeight: 0,
          imageSizes: null,
          indexOffset: null,
        },
        rooms: {
          images: null,
          featureLimit: 0,
          filterCriteria: null,
          includeMissing: false,
          includeSoldOut: false,
          includeDmcRoomId: false,
          soldOutRoomCriteria: null,
          showRoomSize: true,
          showRoomFacilities: true,
          showRoomName: false,
        },
        nonHotelAccommodation: true,
        engagement: true,
        highlights: {
          maxNumberOfItems: 0,
          images: {
            imageSizes: [
              {
                key: "full",
                size: {
                  width: 0,
                  height: 0,
                },
              },
            ],
          },
        },
        personalizedInformation: true,
        localInformation: {
          images: null,
        },
        features: null,
        rateCategories: true,
        contentRateCategories: {
          escapeRateCategories: {},
        },
        synopsis: true,
      },
      PricingSummaryRequest: {
        cheapestOnly: true,
        context: {
          isAllowBookOnRequest: true,
          abTests: [
            {
              testId: 9021,
              abUser: "B",
            },
            {
              testId: 9023,
              abUser: "B",
            },
            {
              testId: 9024,
              abUser: "B",
            },
            {
              testId: 9025,
              abUser: "B",
            },
            {
              testId: 9027,
              abUser: "B",
            },
            {
              testId: 9029,
              abUser: "B",
            },
          ],
          clientInfo: {
            cid: 1918967,
            languageId: 9,
            languageUse: 1,
            origin: "KR",
            platform: 1,
            searchId: searchId,
            storefront: 3,
            userId: userId,
            ipAddress: ipAddress,
          },
          experiment: [
            {
              name: "JGCW-204",
              variant: "B",
            },
          ],
          sessionInfo: {
            isLogin: false,
            memberId: 0,
            sessionId: 1,
          },
          packaging: null,
        },
        isSSR: true,
        pricing: {
          bookingDate: dates.bookingDate,
          checkIn: dates.checkIn,
          checkout: dates.checkout,
          localCheckInDate: dates.localCheckInDate,
          localCheckoutDate: dates.localCheckoutDate,
          currency: SEARCH_CONFIG.CURRENCY,
          details: {
            cheapestPriceOnly: false,
            itemBreakdown: false,
            priceBreakdown: false,
          },
          featureFlag: [
            "ClientDiscount",
            "PriceHistory",
            "VipPlatinum",
            "RatePlanPromosCumulative",
            "PromosCumulative",
            "CouponSellEx",
            "MixAndSave",
            "APSPeek",
            "StackChannelDiscount",
            "AutoApplyPromos",
            "EnableAgencySupplyForPackages",
            "EnableCashback",
            "CreditCardPromotionPeek",
            "EnableCofundedCashback",
            "DispatchGoLocalForInternational",
            "EnableGoToTravelCampaign",
          ],
          features: {
            crossOutRate: false,
            isAPSPeek: false,
            isAllOcc: false,
            isApsEnabled: false,
            isIncludeUsdAndLocalCurrency: false,
            isMSE: true,
            isRPM2Included: true,
            maxSuggestions: 0,
            isEnableSupplierFinancialInfo: false,
            isLoggingAuctionData: false,
            newRateModel: false,
            overrideOccupancy: false,
            filterCheapestRoomEscapesPackage: false,
            priusId: 0,
            synchronous: false,
            enableRichContentOffer: true,
            showCouponAmountInUserCurrency: false,
            disableEscapesPackage: false,
            enablePushDayUseRates: false,
            enableDayUseCor: false,
          },
          filters: {
            cheapestRoomFilters: [],
            filterAPO: false,
            ratePlans: [1],
            secretDealOnly: false,
            suppliers: [],
            nosOfBedrooms: [],
          },
          includedPriceInfo: false,
          occupancy: {
            adults: SEARCH_CONFIG.ADULTS,
            children: SEARCH_CONFIG.CHILDREN,
            childAges: [],
            rooms: SEARCH_CONFIG.ROOMS,
            childrenTypes: [],
          },
          supplierPullMetadata: {
            requiredPrecheckAccuracyLevel: 0,
          },
          mseHotelIds: [],
          mseClicked: "",
          ppLandingHotelIds: [],
          searchedHotelIds: [],
          paymentId: -1,
          externalLoyaltyRequest: null,
        },
        suggestedPrice: "Exclusive",
      },
      PriceStreamMetaLabRequest: {
        attributesId: [8, 1, 18, 7, 11, 2, 3],
      },
    },
    query: createGraphQLQuery(),
  };
}

// 요청 헤더 생성
function createHeaders(ids, currentCityId, cityNames, dates) {
  const { userId, searchId, correlationId, requestId, sessionId, cookieId } = ids;
  
  return {
    accept: "*/*",
    "accept-language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
    "access-control-max-age": "7200",
    "ag-analytics-session-id": sessionId,
    "ag-correlation-id": correlationId,
    "ag-debug-override-origin": "KR",
    "ag-language-locale": SEARCH_CONFIG.LOCALE,
    "ag-page-type-id": "103",
    "ag-request-attempt": "1",
    "ag-request-id": requestId,
    "ag-retry-attempt": "0",
    "content-type": "application/json",
    cookie: `agoda.user.03=UserId=${userId}; agoda.prius=PriusID=0&PointsMaxTraffic=Agoda; agoda.version.03=CookieId=${cookieId}&CuLang=9&DLang=ko-kr&CurLabel=KRW; agoda.price.01=PriceView=1; _ab50group=GroupA; _40-40-20Split=Group40B; _gcl_aw=GCL.1729090087.Cj0KCQjwyL24BhCtARIsALo0fSASQifjW9DKTUkHo4q8HSdRY1pLy-PTkMr2NKXGPN2Z1Id9IyBRnj0aAn1sEALw_wcB; _gcl_au=1.1.413643856.1729090087; FPID=FPID2.2.xwrWjbY6M7GB0%2Btnv%2BOwIytpMMZBHd%2BAyXeULbfzIwk%3D.1729090087; _fbp=fb.1.1729090089517.845933860548422502; _gac_UA-6446424-30=1.1729090090.`,
    origin: "https://www.agoda.com",
    priority: "u=1, i",
    referer: `https://www.agoda.com/ko-kr/search?guid=${uuidv4()}&asq=xnE4m4B3J2bnen3uk7cgKZufa9Vwpz6XltTHq4n%2B9gO0nYk%2Bg4g2qSIAq8iv0AUwZWJFF6yYMiBY8rcVRpdP0mC4%2FfgNufbFhSsYlYxZSNRVhT6FkKh1%2BTjoe8JQfGKcr6QDs48C6hOjLzuYUvlEgOm%2B3QacrQMDUE7JkJAfzu2%2FINgxc4FsfVvfuduoOHjsyZMojV4oQ5909FtpArjmUA%3D%3D&city=${currentCityId}&tick=${Date.now()}&locale=ko-kr&ckuid=${userId}&prid=0&currency=KRW&correlationId=${correlationId}&analyticsSessionId=${sessionId}&pageTypeId=103&realLanguageId=9&languageId=9&origin=KR&stateCode=41&cid=${LINK_PRICE_CID}&userId=${userId}&whitelabelid=1&loginLvl=0&storefrontId=3&currencyId=26&currencyCode=KRW&htmlLanguage=ko-kr&cultureInfoName=ko-kr&machineName=hk-pc-2h-acm-web-user-74cb5d58c4-sk6rr&trafficGroupId=2&trafficSubGroupId=2&aid=300781&useFullPageLogin=true&cttp=4&isRealUser=true&mode=production&browserFamily=Chrome&cdnDomain=agoda.net&checkIn=${dates.localCheckInDate}&checkOut=${dates.localCheckoutDate}&rooms=1&adults=1&children=0&priceCur=KRW&los=1&textToSearch=${encodeURIComponent(cityNames[currentCityId] || '')}&productType=-1&travellerType=0&familyMode=off`,
    "sec-ch-ua": '"Google Chrome";v="129", "Not=A?Brand";v="8", "Chromium";v="129"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
  };
}

// Agoda API 호출 함수
async function callAgodaApi(currentCityId, page, cityNames) {
  const dates = getCheckInDates();
  
  // 매 요청마다 새로운 ID들 생성
  const ids = {
    userId: generateUserId(),
    searchId: generateSearchId(),
    correlationId: generateCorrelationId(),
    requestId: generateRequestId(),
    sessionId: generateSessionId(),
    ipAddress: generateRandomIP(),
    cookieId: generateCookieId(),
  };

  const requestData = createRequestData(currentCityId, page, dates, ids);
  const headers = createHeaders(ids, currentCityId, cityNames, dates);

  const response = await axios.post(
    "https://www.agoda.com/graphql/search",
    requestData,
    { headers }
  );

  return response;
}

module.exports = {
  callAgodaApi,
  getRandomHotel,
  organizeHotelInfo,
  saveHotelToFile
}; 