const { LINK_PRICE_CID } = require('./config');
const { getLanguageName } = require('./utils');

// 호텔 정보 구조화 함수
function organizeHotelInfo(data, existingHotels, customCid = null) {
  let newHotelsFound = 0;

  data.data.citySearch.properties.forEach((property) => {
    const hotelName = property.content.informationSummary.displayName;
    const hotelId = property.propertyId;
    const propertyUrl =
      property.content.informationSummary.propertyLinks?.propertyPage || "N/A";

    // 링크프라이스 URL 생성 - 전달받은 CID 우선 사용
    const activeCid = customCid || LINK_PRICE_CID;
    console.log(`🔍 링크 생성 - 사용할 CID: ${activeCid} (전달받은 CID: ${customCid})`);
    const linkPriceUrl = `https://lase.kr/click.php?m=agoda&a=${activeCid}&l=9999&l_cd1=3&l_cd2=0&tu=${encodeURIComponent(`https://www.agoda.com/partners/partnersearch.aspx?pcs=1&cid=1729890&hid=${hotelId}`)}`;

    // URL은 hotel 객체에 추가될 예정

    // 시설 정보 추출
    const facilities =
      property.content.facilities?.map((f) => f.propertyFacilityName) || [];
    const enrichmentFacilities =
      property.enrichment?.roomInformation?.facilities?.map(
        (f) => f.propertyFacilityName
      ) || [];
    const allFacilities = [
      ...new Set([...facilities, ...enrichmentFacilities]),
    ];

    // 가격 정보 추출
    let price = "N/A";
    try {
      if (property.pricing?.isAvailable && property.pricing?.offers) {
        const offers = property.pricing.offers;
        for (const offer of offers) {
          if (offer.roomOffers && offer.roomOffers.length > 0) {
            const roomOffer = offer.roomOffers[0].room;
            if (roomOffer.pricing && roomOffer.pricing.length > 0) {
              const priceInfo =
                roomOffer.pricing[0].price.perRoomPerNight.exclusive;
              price = priceInfo.display || "N/A";
              break;
            }
          }
        }
      }
    } catch (e) {
      console.log(`Price extraction error for ${hotelName}: ${e.message}`);
    }

    // 위치 정보 추출
    const landmarks = property.content.localInformation?.landmarks || {};
    const cityCenter =
      property.content.highlight?.cityCenter?.distanceFromCityCenter;
    const hasAirportTransfer =
      property.content.localInformation?.hasAirportTransfer;

    // 호텔 특징 정보 추출
    const atmospheres = property.content.informationSummary?.atmospheres || [];
    const familyFeatures = property.content.familyFeatures;
    const propertyType = property.content.informationSummary?.propertyType;

    // 상세 리뷰 점수 추출
    const reviewGrades =
      property.content.reviews?.contentReview?.[0]?.demographics?.groups?.[0]
        ?.grades || [];
    const detailedReviews = {};
    reviewGrades.forEach((grade) => {
      detailedReviews[grade.id] = grade.score;
    });

    // 이미지 URL과 alt값
    const images =
      property.content.images?.hotelImages?.reduce((acc, img) => {
        // 모든 URL과 캡션 출력해서 확인
        console.log("Available URLs:", img.urls);
        console.log("Caption:", img.caption);

        if (img.urls && Array.isArray(img.urls)) {
          const imageUrl = img.urls.find((u) => u.value)?.value;
          const caption = img.caption || "No caption available"; // 캡션이 없을 때 기본 메시지 설정
          if (imageUrl) acc.push({ url: imageUrl, caption: caption });
        }
        return acc;
      }, []) || [];

    console.log(images); // 이미지 URL과 캡션 배열 확인

    // 지원 언어 추출
    const languages =
      property.content.informationSummary.spokenLanguages?.map((lang) => ({
        id: lang.id,
        name: getLanguageName(lang.id),
      })) || [];

    // 프로모션 정보 추출 부분 수정
    let priceDetails = {};
    if (property.pricing?.offers?.[0]?.roomOffers?.[0]?.room) {
      const roomOffer = property.pricing.offers[0].roomOffers[0].room;
      const promos = [];

      // 디버깅을 위한 로그
      console.log("Room Offer:", JSON.stringify(roomOffer, null, 2));

      // 일반 프로모션
      if (roomOffer.promotions && Array.isArray(roomOffer.promotions)) {
        promos.push(
          ...roomOffer.promotions.map((promo) => ({
            종류: promo.typeId,
            설명: promo.description,
            할인율: promo.promotionDiscount?.value,
          }))
        );
      }

      // 채널 할인
      if (
        roomOffer.pricing?.[0]?.channelDiscountSummary?.channelDiscountBreakdown
      ) {
        const discounts =
          roomOffer.pricing[0].channelDiscountSummary.channelDiscountBreakdown;
        promos.push(
          ...discounts.map((d) => ({
            종류: "채널할인",
            할인율: d.discountPercent,
            금액: d.display,
          }))
        );
      }

      // 누적 프로모션
      if (roomOffer.pricing?.[0]?.promotionsCumulative) {
        const cumulative = roomOffer.pricing[0].promotionsCumulative;
        promos.push(
          ...cumulative.map((c) => ({
            종류: "누적할인",
            유형: c.promotionCumulativeType,
            할인율: c.amountPercentage,
            최소숙박: c.minNightsStay,
          }))
        );
      }

      priceDetails = {
        캐시백: roomOffer.cashback
          ? {
              퍼센트: roomOffer.cashback.percentage,
              적립일: roomOffer.cashback.dayToEarn,
              만료일: roomOffer.cashback.expiryDay,
            }
          : null,
      };
    }

    // ID로 중복 체크
    const existingHotel = Object.values(existingHotels).find(
      (hotel) => hotel.id === hotelId
    );
    if (!existingHotel) {
      existingHotels[hotelName] = {
        아이디: hotelId,
        이름: hotelName,
        링크: `https://www.agoda.com${propertyUrl}`,
        등급: property.content.informationSummary.rating,
        주소: {
          국가: property.content.informationSummary.address.country.name,
          도시: property.content.informationSummary.address.city.name,
          지역: property.content.informationSummary.address.area.name,
          좌표: property.content.informationSummary.geoInfo,
        },
        리뷰: {
          평점: property.content.reviews?.cumulative?.score || "N/A",
          리뷰수: property.content.reviews?.cumulative?.reviewCount || 0,
          상세평가: {
            종합: detailedReviews.overall || "N/A",
            청결도: detailedReviews.cleanliness || "N/A",
            시설: detailedReviews.facilities || "N/A",
            위치: detailedReviews.location || "N/A",
            친절: detailedReviews.staffPerformance || "N/A",
            가성비: detailedReviews.valueForMoney || "N/A",
          },
        },
        가격: price,
        편의시설: allFacilities,
        위치정보: {
          주변장소:
            landmarks.topLandmark?.map((place) => ({
              장소명: place.landmarkName,
              거리: `${(place.distanceInM / 1000).toFixed(1)}km`,
            })) || [],
          도심까지거리: cityCenter
            ? `${(cityCenter / 1000).toFixed(1)}km`
            : "N/A",
          공항셔틀: hasAirportTransfer || false,
        },
        객실정보:
          property.content.nonHotelAccommodation?.masterRooms?.map((room) => ({
            침실수: room.noOfBedrooms,
            욕실수: room.noOfBathrooms,
            침대수: room.noOfBeds,
            객실크기: room.roomSizeSqm,
            하이라이트시설: room.highlightedFacilities,
          })) || [],
        특징: {
          숙소유형: propertyType || "N/A",
          분위기: atmospheres.map((atm) => atm.name) || [],
          가족여행: {
            무료어린이: familyFeatures?.hasChildrenFreePolicy || false,
            패밀리룸: familyFeatures?.isFamilyRoom || false,
            키즈풀: familyFeatures?.hasKidsPool || false,
            키즈클럽: familyFeatures?.hasKidsClub || false,
            다중침실: familyFeatures?.hasMoreThanOneBedroom || false,
          },
        },
        이미지: images,
        지원언어: languages.map((lang) => lang.name),
        가격정보: {
          기본가격: price,
          ...priceDetails,
        },
        agoda_url: linkPriceUrl,
      };
      newHotelsFound++;
    }
  });

  return { hotels: existingHotels, newCount: newHotelsFound };
}

module.exports = {
  organizeHotelInfo
}; 