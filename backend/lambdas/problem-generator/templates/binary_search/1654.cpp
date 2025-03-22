// BOJ - 1654 랜선 자르기

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define MAXN 1000001
 
using namespace std;

ll k, n, arr[MAXN] = {0, }, k_max = 0;
ll count(ll m) {
    ll cnt = 0;
    loop(i, 0, k - 1)
        cnt += (arr[i] / m);
    return cnt;
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
    
    cin >> k >> n;
    loop(i, 0, k - 1) {
        cin >> arr[i];
        k_max = max(k_max, arr[i]);
    }

    ll s = 1, e = k_max, ans;
    while(s <= e) {
        ll m = (s + e) / 2;
        if(count(m) >= n) { // available
            ans = m;
            s = m + 1;
        }
        else e = m - 1;
    }

    cout << ans << '\n';
}