// BOJ - 20922 겹치는 건 싫어

// 같은 원소가 K개 이하인 최장 연속 부분 수열

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define MAXN 200001
#define MAXC 100001
 
using namespace std;
 
ll arr[MAXN], cnt[MAXC];
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, k; cin >> n >> k;
    loop(i, 1, n) cin >> arr[i];

    ll j = 1, ans = 0; // [i, j) 범위
    loop(i, 1, n) {
        while(j <= n && cnt[arr[j]] < k) cnt[arr[j++]]++;
        ans = max(ans, j - i);
        cnt[arr[i]]--;
    }

    cout << ans << '\n';
}