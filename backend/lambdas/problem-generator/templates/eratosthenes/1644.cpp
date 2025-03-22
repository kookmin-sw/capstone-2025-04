// BOJ - 1644 소수의 연속합 (two pointer ver.)

#include <bits/stdc++.h>
#define loop(i, s, n) for(int i = s; i <= n; i++)
#define LOOP(i, s, n) for(int i = s; i < n; i++)
#define ll long long int
#define MAXN 4000001
 
using namespace std;
 
vector<ll> primes; ll notprime[MAXN] = {1, 1, 0};
void eratosthenes() {
    for(int i = 2; i * i < MAXN; i++)
        if(!notprime[i])
            for(int j = 2; i * j < MAXN; j++)
                notprime[i * j] = 1;
    LOOP(i, 2, MAXN) if(!notprime[i]) primes.push_back(i);
}
int main() {
    ios::sync_with_stdio(false); cin.tie(0);
 
    eratosthenes();

    ll n; cin >> n;
    ll ans = 0, j = 0, sum = 0; // [i, j)
    LOOP(i, 0, primes.size()) {
        if(n < primes[i]) break;
        while(j < primes.size() && sum < n) sum += primes[j++];
        if(sum == n) ans++;
        sum -= primes[i];
    }
    cout << ans << '\n';
}