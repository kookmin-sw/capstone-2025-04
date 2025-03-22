// BOJ - 2512 예산

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define MAXN 10001
 
using namespace std;
 
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    ll n, arr[MAXN] = {0, }; cin >> n;
    loop(i, 1, n) cin >> arr[i];
    sort(arr + 1, arr + 1 + n);
    ll m, ans = 0; cin >> m;

    loop(i, 1, n) {
        ll remain = n - i + 1;
        if(m >= arr[i] * remain) m -= arr[i], ans = arr[i];
        else {
            ans = m / remain; break;
        }
    }

    cout << ans << '\n';
}